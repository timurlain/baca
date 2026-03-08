using System.ComponentModel.DataAnnotations;

namespace Baca.Api.Models;

public class TaskItem
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public required string Title { get; set; }

    public string? Description { get; set; }

    public TaskItemStatus Status { get; set; } = TaskItemStatus.Open;

    public Priority Priority { get; set; } = Priority.Medium;

    public int? CategoryId { get; set; }

    public int? AssigneeId { get; set; }

    public int? ParentTaskId { get; set; }

    public DateTime? DueDate { get; set; }

    public int SortOrder { get; set; }

    public int CreatedById { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Category? Category { get; set; }
    public User? Assignee { get; set; }
    public TaskItem? ParentTask { get; set; }
    public User CreatedBy { get; set; } = null!; // EF Core populates
    public ICollection<TaskItem> Subtasks { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
}
