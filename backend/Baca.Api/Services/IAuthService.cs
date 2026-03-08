using Baca.Api.DTOs;
using Baca.Api.Models;

namespace Baca.Api.Services;

public interface IAuthService
{
    Task<bool> RequestMagicLinkAsync(string email, CancellationToken ct = default);
    Task<User?> VerifyTokenAsync(string token, CancellationToken ct = default);
    Task<User?> VerifyGuestPinAsync(string pin, CancellationToken ct = default);
    Task<AuthResponse?> GetCurrentUserAsync(int userId, CancellationToken ct = default);
    string GenerateSessionCookie(User user);
    int? ValidateSessionCookie(string cookie);
}
