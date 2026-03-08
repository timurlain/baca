using System.ComponentModel.DataAnnotations;

namespace Baca.Api.Models;

public class Category
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public required string Name { get; set; }

    [MaxLength(7)]
    public string Color { get; set; } = "#3B82F6";

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<TaskItem> Tasks { get; set; } = [];
}
