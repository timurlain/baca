using System.ComponentModel.DataAnnotations;

namespace Baca.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    public UserRole Role { get; set; }

    public int? GameRoleId { get; set; }

    [MaxLength(2)]
    public string? Shortcut { get; set; }

    [MaxLength(7)]
    public string AvatarColor { get; set; } = "#3B82F6";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public GameRole? GameRole { get; set; }
    public ICollection<TaskItem> AssignedTasks { get; set; } = [];
    public ICollection<TaskItem> CreatedTasks { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<LoginToken> LoginTokens { get; set; } = [];
}
