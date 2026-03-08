using Baca.Api.Models;

namespace Baca.Api.DTOs;

public record TaskDto(
    int Id,
    string Title,
    string? Description,
    TaskItemStatus Status,
    Priority Priority,
    int? CategoryId,
    string? CategoryName,
    string? CategoryColor,
    int? AssigneeId,
    string? AssigneeName,
    string? AssigneeAvatarColor,
    int? ParentTaskId,
    DateTime? DueDate,
    int SortOrder,
    int CreatedById,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int SubTaskCount,
    int SubTaskDoneCount,
    int CommentCount
);

public record TaskDetailDto(
    int Id,
    string Title,
    string? Description,
    TaskItemStatus Status,
    Priority Priority,
    int? CategoryId,
    string? CategoryName,
    string? CategoryColor,
    int? AssigneeId,
    string? AssigneeName,
    string? AssigneeAvatarColor,
    int? ParentTaskId,
    string? ParentTaskTitle,
    DateTime? DueDate,
    int SortOrder,
    int CreatedById,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<TaskDto> SubTasks,
    List<CommentDto> Comments
);

public record CreateTaskRequest(
    string Title,
    string? Description,
    TaskItemStatus? Status,
    Priority? Priority,
    int? CategoryId,
    int? AssigneeId,
    int? ParentTaskId,
    DateTime? DueDate
);

public record UpdateTaskRequest(
    string? Title,
    string? Description,
    TaskItemStatus? Status,
    Priority? Priority,
    int? CategoryId,
    int? AssigneeId,
    int? ParentTaskId,
    DateTime? DueDate
);

public record StatusChangeRequest(
    TaskItemStatus Status,
    int? SortOrder
);

public record SortChangeRequest(
    int SortOrder
);

public record FocusTaskDto(
    int Id,
    string Title,
    TaskItemStatus Status,
    Priority Priority,
    int? CategoryId,
    string? CategoryName,
    string? CategoryColor,
    DateTime? DueDate,
    int SubTaskCount,
    int SubTaskDoneCount
);
