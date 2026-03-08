using Baca.Api.Data;
using Baca.Api.Endpoints;
using Baca.Api.Middleware;
using Baca.Api.Models;
using Baca.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

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
builder.Services.AddScoped<IAuthService, NotImplementedAuthService>();
builder.Services.AddScoped<IEmailService, NotImplementedEmailService>();
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
        // Default admin user
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
        var categories = new[]
        {
            new Category { Name = "Hra", Color = "#3B82F6", SortOrder = 1 },
            new Category { Name = "Logistika", Color = "#F59E0B", SortOrder = 2 },
            new Category { Name = "Jídlo", Color = "#EF4444", SortOrder = 3 },
            new Category { Name = "Rekvizity", Color = "#8B5CF6", SortOrder = 4 },
            new Category { Name = "Komunikace", Color = "#06B6D4", SortOrder = 5 },
        };
        db.Categories.AddRange(categories);
        await db.SaveChangesAsync();
    }

    var settings = await db.AppSettings.FindAsync(1);
    if (settings == null)
    {
        var defaultPin = app.Configuration["Seed:GuestPin"] ?? "ovcina2026";
        var hashedPin = HashPin(defaultPin);
        db.AppSettings.Add(new AppSettings
        {
            Id = 1,
            GuestPin = hashedPin,
            AppName = "Bača"
        });
        await db.SaveChangesAsync();
    }
}

static string HashPin(string pin)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(pin));
    return Convert.ToBase64String(bytes);
}

// Make Program accessible for integration tests
public partial class Program;

// Placeholder service implementations
file class NotImplementedAuthService : IAuthService
{
    public Task<bool> RequestMagicLinkAsync(string email, CancellationToken ct) => throw new NotImplementedException();
    public Task<User?> VerifyTokenAsync(string token, CancellationToken ct) => throw new NotImplementedException();
    public Task<User?> VerifyGuestPinAsync(string pin, CancellationToken ct) => throw new NotImplementedException();
    public Task<Baca.Api.DTOs.AuthResponse?> GetCurrentUserAsync(int userId, CancellationToken ct) => throw new NotImplementedException();
    public string GenerateSessionCookie(User user) => throw new NotImplementedException();
    public int? ValidateSessionCookie(string cookie) => throw new NotImplementedException();
}

file class NotImplementedEmailService : IEmailService
{
    public Task SendMagicLinkAsync(string email, string name, string token, CancellationToken ct) => throw new NotImplementedException();
}

file class NotImplementedDashboardService : IDashboardService
{
    public Task<Baca.Api.DTOs.DashboardDto> GetDashboardAsync(int? currentUserId, CancellationToken ct) => throw new NotImplementedException();
}

file class NotImplementedVoiceTranscriptionService : IVoiceTranscriptionService
{
    public Task<string> TranscribeAsync(Stream audioStream, string contentType, CancellationToken ct) => throw new NotImplementedException();
}

file class NotImplementedVoiceParsingService : IVoiceParsingService
{
    public Task<Baca.Api.DTOs.VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct) => throw new NotImplementedException();
}

file class NotImplementedWhatsAppNotificationService : IWhatsAppNotificationService
{
    public Task SendTaskAssignedAsync(TaskItem task, User assignee, User assignedBy, CancellationToken ct) => throw new NotImplementedException();
}
