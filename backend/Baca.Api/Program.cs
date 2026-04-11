using System.Globalization;
using System.Security.Claims;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Endpoints;
using Baca.Api.Middleware;
using Baca.Api.Models;
using Baca.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Database
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Host=localhost;Database=baca;Username=baca_admin;Password=dev_password";
builder.Services.AddDbContext<BacaDbContext>(options =>
    options.UseNpgsql(connectionString));

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
            ?? ["http://localhost:3000"];
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Services — real implementations
builder.Services.AddSingleton(TimeProvider.System);

// Dashboard + Voice + WhatsApp (Agent B)
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IVoiceTranscriptionService, VoiceTranscriptionService>();
builder.Services.AddHttpClient<IVoiceParsingService, VoiceParsingService>();
builder.Services.AddSingleton<ITwilioWhatsAppClient, TwilioWhatsAppClient>();
builder.Services.AddScoped<IWhatsAppNotificationService, WhatsAppNotificationService>();

builder.Services.AddHttpClient("OidcTokenRefresh");
builder.Services.AddSingleton<Baca.Api.Services.IBlobStorageService, Baca.Api.Services.BlobStorageService>();

// Authentication — OIDC via registrace-ovcina
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.LoginPath = "/api/auth/login";
    options.ExpireTimeSpan = TimeSpan.FromDays(30);
    options.SlidingExpiration = true;
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Events.OnRedirectToLogin = context =>
    {
        // For API calls, return 401 instead of redirect
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = 401;
            return Task.CompletedTask;
        }
        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    };
    options.Events.OnValidatePrincipal = context =>
    {
        // If the cookie can't be decrypted (e.g. after container restart with new keys),
        // reject it so the user gets a fresh login instead of a cryptic error
        if (context.Principal?.Identity?.IsAuthenticated != true)
        {
            context.RejectPrincipal();
        }
        return Task.CompletedTask;
    };
})
.AddOpenIdConnect(options =>
{
    options.Authority = builder.Configuration["Oidc:Authority"];
    options.ClientId = builder.Configuration["Oidc:ClientId"];
    options.ClientSecret = builder.Configuration["Oidc:ClientSecret"];
    options.ResponseType = "code";
    options.UsePkce = true;
    options.SaveTokens = true;
    options.CallbackPath = "/api/auth/callback";

    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.Scope.Add("email");
    options.Scope.Add("roles");

    options.GetClaimsFromUserInfoEndpoint = true;
    options.MapInboundClaims = false;
    options.ClaimActions.MapJsonKey("role", "role");

    options.TokenValidationParameters.NameClaimType = "name";
    options.TokenValidationParameters.RoleClaimType = "role";
    // OpenIddict gotchas: issuer has trailing slash, disable audience validation
    options.TokenValidationParameters.ValidIssuer = builder.Configuration["Oidc:Authority"]?.TrimEnd('/') + "/";
    options.TokenValidationParameters.ValidateAudience = false;

    // If OIDC callback fails (e.g. stale state cookie after restart), clear cookies and retry
    options.Events.OnRemoteFailure = context =>
    {
        context.Response.Cookies.Delete(".AspNetCore.Cookies");
        context.Response.Cookies.Delete(".AspNetCore.OpenIdConnect.Nonce." + context.Properties?.Items["N"]);
        context.Response.Redirect("/");
        context.HandleResponse();
        return Task.CompletedTask;
    };

    // Fix redirect_uri behind Azure Container Apps proxy
    options.Events.OnRedirectToIdentityProvider = context =>
    {
        var baseUrl = context.HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["App:BaseUrl"];
        if (!string.IsNullOrEmpty(baseUrl))
        {
            context.ProtocolMessage.RedirectUri = $"{baseUrl.TrimEnd('/')}{options.CallbackPath}";
        }
        return Task.CompletedTask;
    };

    options.Events.OnTokenValidated = async context =>
    {
        var db = context.HttpContext.RequestServices.GetRequiredService<BacaDbContext>();
        var sub = context.Principal?.FindFirstValue("sub");
        var name = context.Principal?.FindFirstValue("name") ?? "Unknown";
        var email = context.Principal?.FindFirstValue("email") ?? "";

        if (sub is null) return;

        var user = await db.Users.FirstOrDefaultAsync(u => u.RegistraceUserId == sub);
        if (user is not null && (user.IsDeleted || !user.IsActive))
        {
            context.Fail("User account is deactivated");
            return;
        }

        if (user is null)
        {
            // Only try email migration if we have a real email
            if (!string.IsNullOrWhiteSpace(email))
            {
                user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && u.RegistraceUserId == null);
            }

            if (user is not null)
            {
                user.RegistraceUserId = sub;
            }
            else
            {
                var roles = context.Principal?.FindAll("role").Select(c => c.Value).ToList() ?? [];
                user = new User
                {
                    Name = name,
                    Email = email,
                    RegistraceUserId = sub,
                    Role = roles.Contains("Admin") ? UserRole.Admin
                        : roles.Contains("Guest") ? UserRole.Guest
                        : UserRole.User,
                    AvatarColor = "#3B82F6",
                    IsActive = true,
                };
                db.Users.Add(user);
            }
        }
        else
        {
            user.Name = name;
        }

        await db.SaveChangesAsync();

        // Add the local user ID as a claim so endpoints can use it
        var identity = context.Principal?.Identity as ClaimsIdentity;
        identity?.AddClaim(new Claim("local_user_id", user.Id.ToString(CultureInfo.InvariantCulture)));
        identity?.AddClaim(new Claim("local_user_role", user.Role.ToString()));
        identity?.AddClaim(new Claim("local_avatar_color", user.AvatarColor));
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Seed data on startup
await SeedDataAsync(app);

// Middleware
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
        | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
        | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedHost,
};
// Azure Container Apps: trust any proxy
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<TokenRefreshMiddleware>();
app.UseAuthorization();

// Populate HttpContext.Items from claims for backward compatibility with endpoints
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var localUserIdStr = context.User.FindFirstValue("local_user_id");
        var localRoleStr = context.User.FindFirstValue("local_user_role");

        if (int.TryParse(localUserIdStr, out var localUserId))
        {
            context.Items["UserId"] = localUserId;
        }

        if (Enum.TryParse<UserRole>(localRoleStr, out var role))
        {
            context.Items["Role"] = role;
        }
    }

    await next();
});

// Endpoints
app.MapHealthEndpoints();
app.MapAuthEndpoints();
app.MapTaskEndpoints();
app.MapCommentEndpoints();
app.MapCategoryEndpoints();
app.MapGameRoleEndpoints();
app.MapUserEndpoints();
app.MapDashboardEndpoints();
app.MapFocusEndpoints();
app.MapVoiceEndpoints();
app.MapSettingsEndpoints();
app.MapTagEndpoints();
app.MapTrashEndpoints();
app.MapImageEndpoints();

// Test-only endpoint for E2E authentication (never available in Production)
if (!app.Environment.IsProduction())
{
    app.MapPost("/api/test/login/{email}", async (
        string email,
        BacaDbContext db,
        HttpContext context,
        CancellationToken ct) =>
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null)
            return Results.NotFound();

        var claims = new List<Claim>
        {
            new("sub", user.RegistraceUserId ?? $"test-{user.Id}"),
            new("name", user.Name),
            new("email", user.Email ?? ""),
            new("role", user.Role.ToString()),
            new("local_user_id", user.Id.ToString(CultureInfo.InvariantCulture)),
            new("local_user_role", user.Role.ToString()),
            new("local_avatar_color", user.AvatarColor),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        return Results.Ok(new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Role = user.Role,
            AvatarColor = user.AvatarColor
        });
    });
}

app.Run();

// Seed data
static async Task SeedDataAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();

    await db.Database.MigrateAsync();

    if (!await db.Users.AnyAsync())
    {
        var adminEmail = app.Configuration["Seed:AdminEmail"] ?? "admin@baca.local";
        var adminName = app.Configuration["Seed:AdminName"] ?? "Tomáš";
        var adminPhone = app.Configuration["Seed:AdminPhone"];

        db.Users.Add(new User
        {
            Name = adminName,
            Email = adminEmail,
            Phone = adminPhone,
            Role = UserRole.Admin,
            AvatarColor = "#10B981"
        });

        db.Users.Add(new User
        {
            Name = "Host",
            Email = "guest@baca.local",
            Role = UserRole.Guest,
            AvatarColor = "#6B7280"
        });

        await db.SaveChangesAsync();
    }

    if (!await db.Categories.AnyAsync())
    {
        db.Categories.AddRange(
            new Category { Name = "Hra", Color = "#3B82F6", SortOrder = 1 },
            new Category { Name = "Logistika", Color = "#F59E0B", SortOrder = 2 },
            new Category { Name = "Jídlo", Color = "#EF4444", SortOrder = 3 },
            new Category { Name = "Rekvizity", Color = "#8B5CF6", SortOrder = 4 },
            new Category { Name = "Komunikace", Color = "#06B6D4", SortOrder = 5 }
        );
        await db.SaveChangesAsync();
    }

    if (!await db.GameRoles.AnyAsync())
    {
        db.GameRoles.AddRange(
            new GameRole { Name = "Osud", Description = "Game Master", Color = "#7DD3FC", SortOrder = 1 },
            new GameRole { Name = "Vládce", Description = "Nation Ruler", Color = "#8B5CF6", SortOrder = 2 },
            new GameRole { Name = "Obchodník", Description = "Merchant", Color = "#D4A017", SortOrder = 3 },
            new GameRole { Name = "Příručí", Description = "City Assistant", Color = "#3B82F6", SortOrder = 4 },
            new GameRole { Name = "CP", Description = "Story-driving NPC (Poustevník, Šašek, Vědma)", Color = "#EC4899", SortOrder = 5 },
            new GameRole { Name = "Knihovnice", Description = "Library NPC", Color = "#1E3A5F", SortOrder = 6 },
            new GameRole { Name = "Příšera", Description = "Monster/Creature Handler", Color = "#991B1B", SortOrder = 7 },
            new GameRole { Name = "Hraničář", Description = "Border Guard / Ranger", Color = "#84CC16", SortOrder = 8 },
            new GameRole { Name = "Technická pomoc", Description = "Technical Support", Color = "#6B7280", SortOrder = 9 },
            new GameRole { Name = "Fotograf", Description = "Photographer", Color = "#A855F7", SortOrder = 10 }
        );
        await db.SaveChangesAsync();
    }

    var settings = await db.AppSettings.FindAsync(1);
    if (settings is null)
    {
        var defaultPin = app.Configuration["Seed:GuestPin"] ?? "ovcina2026";
        var hashedPin = BCrypt.Net.BCrypt.HashPassword(defaultPin);
        db.AppSettings.Add(new AppSettings
        {
            Id = 1,
            GuestPin = hashedPin,
            AppName = "Bača"
        });
        await db.SaveChangesAsync();
    }
    else if (string.IsNullOrEmpty(settings.GuestPin))
    {
        var defaultPin = app.Configuration["Seed:GuestPin"] ?? "ovcina2026";
        settings.GuestPin = BCrypt.Net.BCrypt.HashPassword(defaultPin);
        await db.SaveChangesAsync();
    }
}

// Make Program accessible for integration tests
public partial class Program;
