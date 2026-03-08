using Baca.Api.Models;

namespace Baca.Api.DTOs;

public class LoginRequest
{
    public required string Email { get; set; }
}

public class GuestLoginRequest
{
    public required string Pin { get; set; }
}

public class AuthResponse
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required UserRole Role { get; set; }
    public required string AvatarColor { get; set; }
}
