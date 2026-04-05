using System.Security.Cryptography;
using System.Text;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Services;

public class AuthService : IAuthService
{
    private readonly BacaDbContext _db;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;

    public AuthService(BacaDbContext db, IEmailService emailService, IConfiguration config)
    {
        _db = db;
        _emailService = emailService;
        _config = config;
    }

    public async Task<bool> RequestMagicLinkAsync(string email, CancellationToken ct)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct);

        if (user is null)
            return false;

        var loginToken = new LoginToken
        {
            UserId = user.Id,
            Token = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };

        _db.LoginTokens.Add(loginToken);
        await _db.SaveChangesAsync(ct);

        await _emailService.SendMagicLinkAsync(email, user.Name, loginToken.Token, ct);
        return true;
    }

    public async Task<AuthResponse?> VerifyTokenAsync(string token, CancellationToken ct)
    {
        var loginToken = await _db.LoginTokens
            .Include(lt => lt.User)
            .FirstOrDefaultAsync(lt => lt.Token == token, ct);

        if (loginToken is null || loginToken.IsUsed || loginToken.ExpiresAt < DateTime.UtcNow)
            return null;

        loginToken.IsUsed = true;
        await _db.SaveChangesAsync(ct);

        return ToAuthResponse(loginToken.User);
    }

    public async Task<AuthResponse?> VerifyGuestPinAsync(string pin, CancellationToken ct)
    {
        var settings = await _db.AppSettings.FindAsync([1], ct);
        if (settings is null || !BCrypt.Net.BCrypt.Verify(pin, settings.GuestPin))
            return null;

        var guest = await _db.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Guest, ct);

        if (guest is null)
        {
            guest = new User
            {
                Name = "Host",
                Role = UserRole.Guest,
                AvatarColor = "#9CA3AF"
            };
            _db.Users.Add(guest);
            await _db.SaveChangesAsync(ct);
        }

        return ToAuthResponse(guest);
    }

    public async Task<AuthResponse?> GetCurrentUserAsync(int userId, CancellationToken ct)
    {
        var user = await _db.Users.FindAsync([userId], ct);
        if (user is null || !user.IsActive)
            return null;

        return ToAuthResponse(user);
    }

    public Task<string> GenerateSessionCookieAsync(int userId, CancellationToken ct)
    {
        var secret = _config["Auth:Secret"]
            ?? throw new InvalidOperationException("Auth:Secret not configured");
        var expires = DateTimeOffset.UtcNow.AddDays(365).ToUnixTimeSeconds();
        var payload = $"{userId}:{expires}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var signature = Convert.ToBase64String(hash);

        return Task.FromResult($"{payload}:{signature}");
    }

    public Task<int?> ValidateSessionCookieAsync(string cookie, CancellationToken ct)
    {
        var parts = cookie.Split(':');
        if (parts.Length != 3)
            return Task.FromResult<int?>(null);

        if (!int.TryParse(parts[0], out var userId) || !long.TryParse(parts[1], out var expires))
            return Task.FromResult<int?>(null);

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expires)
            return Task.FromResult<int?>(null);

        var secret = _config["Auth:Secret"]
            ?? throw new InvalidOperationException("Auth:Secret not configured");
        var payload = $"{userId}:{expires}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expectedSignature = Convert.ToBase64String(expectedHash);

        if (!string.Equals(parts[2], expectedSignature, StringComparison.Ordinal))
            return Task.FromResult<int?>(null);

        return Task.FromResult<int?>(userId);
    }

    private static AuthResponse ToAuthResponse(User user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Role = user.Role,
        AvatarColor = user.AvatarColor
    };
}
