using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Endpoints;
using Baca.Api.Middleware;
using Baca.Api.Models;
using Baca.Api.Services;
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

// Services — placeholder implementations (agents will replace)
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IAuthService, NotImplementedAuthService>();
builder.Services.AddScoped<IEmailService, NotImplementedEmailService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IVoiceTranscriptionService, VoiceTranscriptionService>();
builder.Services.AddHttpClient<IVoiceParsingService, VoiceParsingService>();
builder.Services.AddSingleton<ITwilioWhatsAppClient, TwilioWhatsAppClient>();
builder.Services.AddScoped<IWhatsAppNotificationService, WhatsAppNotificationService>();
// Services
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDashboardService, NotImplementedDashboardService>();
builder.Services.AddScoped<IVoiceTranscriptionService, NotImplementedVoiceTranscriptionService>();
builder.Services.AddScoped<IVoiceParsingService, NotImplementedVoiceParsingService>();
builder.Services.AddScoped<IWhatsAppNotificationService, NotImplementedWhatsAppNotificationService>();

var app = builder.Build();

// Seed data on startup
await SeedDataAsync(app);

// Middleware
app.UseCors();
app.UseBacaAuth();

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

// Placeholder service implementations (Agent B territory)
file sealed class NotImplementedDashboardService : IDashboardService
{
    public Task<DashboardDto> GetDashboardAsync(int? currentUserId, CancellationToken ct) => throw new NotImplementedException();
}

file sealed class NotImplementedVoiceTranscriptionService : IVoiceTranscriptionService
{
    public Task<Baca.Api.DTOs.TranscriptionResult> TranscribeAsync(Stream audioStream, string contentType, CancellationToken ct) => throw new NotImplementedException();
}

file sealed class NotImplementedVoiceParsingService : IVoiceParsingService
{
    public Task<VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct) => throw new NotImplementedException();
}

file sealed class NotImplementedWhatsAppNotificationService : IWhatsAppNotificationService
{
    public Task SendTaskAssignedAsync(TaskItem task, User assignee, User assignedBy, CancellationToken ct) => throw new NotImplementedException();
}
