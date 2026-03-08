using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Services;

public sealed class DashboardService(BacaDbContext dbContext, TimeProvider timeProvider) : IDashboardService
{
    public async Task<DashboardDto> GetDashboardAsync(int? currentUserId, CancellationToken ct = default)
    {
        var today = timeProvider.GetUtcNow().UtcDateTime.Date;

        var tasksByStatus = await dbContext.TaskItems
            .AsNoTracking()
            .GroupBy(task => task.Status)
            .Select(group => new
            {
                group.Key,
                Count = group.Count()
            })
            .ToDictionaryAsync(
                item => item.Key,
                item => item.Count,
                ct);

        var totalTasks = tasksByStatus.Values.Sum();
        var doneTasks = tasksByStatus.GetValueOrDefault(TaskItemStatus.Done);

        var overdueTasks = await dbContext.TaskItems
            .AsNoTracking()
            .CountAsync(
                task => task.Status != TaskItemStatus.Done
                    && task.DueDate.HasValue
                    && task.DueDate.Value.Date < today,
                ct);

        var categoryProgressData = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .Select(category => new
            {
                category.Id,
                category.Name,
                category.Color,
                TotalTasks = category.Tasks.Count,
                DoneTasks = category.Tasks.Count(task => task.Status == TaskItemStatus.Done)
            })
            .ToListAsync(ct);

        var categoryProgress = categoryProgressData
            .Select(category => new CategoryProgressDto
            {
                CategoryId = category.Id,
                CategoryName = category.Name,
                CategoryColor = category.Color,
                TotalTasks = category.TotalTasks,
                DoneTasks = category.DoneTasks,
                ProgressPercent = category.TotalTasks == 0
                    ? 0
                    : Math.Round(category.DoneTasks * 100d / category.TotalTasks, 2)
            })
            .ToList();

        var recentTasks = await dbContext.TaskItems
            .AsNoTracking()
            .OrderByDescending(task => task.UpdatedAt)
            .Take(10)
            .Select(task => new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                CategoryId = task.CategoryId,
                CategoryName = task.Category != null ? task.Category.Name : null,
                CategoryColor = task.Category != null ? task.Category.Color : null,
                AssigneeId = task.AssigneeId,
                AssigneeName = task.Assignee != null ? task.Assignee.Name : null,
                AssigneeAvatarColor = task.Assignee != null ? task.Assignee.AvatarColor : null,
                ParentTaskId = task.ParentTaskId,
                DueDate = task.DueDate,
                SortOrder = task.SortOrder,
                CreatedById = task.CreatedById,
                CreatedByName = task.CreatedBy.Name,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt,
                SubTaskCount = task.Subtasks.Count,
                SubTaskDoneCount = task.Subtasks.Count(subtask => subtask.Status == TaskItemStatus.Done),
                CommentCount = task.Comments.Count
            })
            .ToListAsync(ct);

        var myTaskCount = currentUserId.HasValue
            ? await dbContext.TaskItems
                .AsNoTracking()
                .CountAsync(
                    task => task.AssigneeId == currentUserId.Value
                        && task.Status != TaskItemStatus.Done,
                    ct)
            : 0;

        return new DashboardDto
        {
            TotalTasks = totalTasks,
            TasksByStatus = Enum.GetValues<TaskItemStatus>()
                .ToDictionary(
                    status => status.ToString(),
                    status => tasksByStatus.GetValueOrDefault(status)),
            OverdueTasks = overdueTasks,
            ProgressPercent = totalTasks == 0
                ? 0
                : Math.Round(doneTasks * 100d / totalTasks, 2),
            CategoryProgress = categoryProgress,
            RecentTasks = recentTasks,
            MyTaskCount = myTaskCount
        };
    }
}
