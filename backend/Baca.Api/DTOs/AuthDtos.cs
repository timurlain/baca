using Baca.Api.Models;

namespace Baca.Api.DTOs;

public record LoginRequest(
    string Email
);

public record GuestLoginRequest(
    string Pin
);

public record AuthResponse(
    int Id,
    string Name,
    UserRole Role,
    string AvatarColor
);
