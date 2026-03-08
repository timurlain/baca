using Baca.Api.DTOs;

namespace Baca.Api.Services;

public interface IAuthService
{
    Task<bool> RequestMagicLinkAsync(string email, CancellationToken ct = default);
    Task<AuthResponse?> VerifyTokenAsync(string token, CancellationToken ct = default);
    Task<AuthResponse?> VerifyGuestPinAsync(string pin, CancellationToken ct = default);
    Task<AuthResponse?> GetCurrentUserAsync(int userId, CancellationToken ct = default);
    Task<string> GenerateSessionCookieAsync(int userId, CancellationToken ct = default);
    Task<int?> ValidateSessionCookieAsync(string cookie, CancellationToken ct = default);
}
