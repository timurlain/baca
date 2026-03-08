using Baca.Api.Models;

namespace Baca.Api.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public required UserRole Role { get; set; }
    public int? GameRoleId { get; set; }
    public string? GameRoleName { get; set; }
    public required string AvatarColor { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserRequest
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public required UserRole Role { get; set; }
    public int? GameRoleId { get; set; }
}

public class UpdateUserRequest
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public UserRole? Role { get; set; }
    public int? GameRoleId { get; set; }
    public bool? IsActive { get; set; }
}
