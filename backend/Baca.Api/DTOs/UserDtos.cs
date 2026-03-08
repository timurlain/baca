using Baca.Api.Models;

namespace Baca.Api.DTOs;

public record UserDto(
    int Id,
    string Name,
    string? Email,
    string? Phone,
    UserRole Role,
    string AvatarColor,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateUserRequest(
    string Name,
    string Email,
    string? Phone,
    UserRole Role
);

public record UpdateUserRequest(
    string? Name,
    string? Phone,
    UserRole? Role,
    bool? IsActive
);
