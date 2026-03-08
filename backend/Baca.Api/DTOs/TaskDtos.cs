using Baca.Api.Models;

namespace Baca.Api.DTOs;

public class TaskDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required TaskItemStatus Status { get; set; }
    public required Priority Priority { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryColor { get; set; }
    public int? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public string? AssigneeAvatarColor { get; set; }
    public int? ParentTaskId { get; set; }
    public DateTime? DueDate { get; set; }
    public int SortOrder { get; set; }
    public int CreatedById { get; set; }
    public required string CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int SubTaskCount { get; set; }
    public int SubTaskDoneCount { get; set; }
    public int CommentCount { get; set; }
}

public class TaskDetailDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required TaskItemStatus Status { get; set; }
    public required Priority Priority { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryColor { get; set; }
    public int? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public string? AssigneeAvatarColor { get; set; }
    public int? ParentTaskId { get; set; }
    public string? ParentTaskTitle { get; set; }
    public DateTime? DueDate { get; set; }
    public int SortOrder { get; set; }
    public int CreatedById { get; set; }
    public required string CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TaskDto> Subtasks { get; set; } = [];
    public List<CommentDto> Comments { get; set; } = [];
}

public class CreateTaskRequest
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public TaskItemStatus? Status { get; set; }
    public Priority? Priority { get; set; }
    public int? CategoryId { get; set; }
    public int? AssigneeId { get; set; }
    public int? ParentTaskId { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public TaskItemStatus? Status { get; set; }
    public Priority? Priority { get; set; }
    public int? CategoryId { get; set; }
    public int? AssigneeId { get; set; }
    public int? ParentTaskId { get; set; }
    public DateTime? DueDate { get; set; }
}

public class StatusChangeRequest
{
    public required TaskItemStatus Status { get; set; }
    public int? SortOrder { get; set; }
}

public class SortChangeRequest
{
    public int SortOrder { get; set; }
}

public class FocusTaskDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required TaskItemStatus Status { get; set; }
    public required Priority Priority { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryColor { get; set; }
    public DateTime? DueDate { get; set; }
    public int SubTaskCount { get; set; }
    public int SubTaskDoneCount { get; set; }
}
