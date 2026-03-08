using System.ComponentModel.DataAnnotations;

namespace Baca.Api.Models;

public class Comment
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    public int AuthorId { get; set; }

    [Required]
    [MaxLength(2000)]
    public required string Text { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public TaskItem Task { get; set; } = null!; // EF Core populates
    public User Author { get; set; } = null!; // EF Core populates
}
