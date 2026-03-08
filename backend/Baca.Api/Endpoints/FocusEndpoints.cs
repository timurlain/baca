using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class FocusEndpoints
{
    public static void MapFocusEndpoints(this WebApplication app)
    {
        app.MapGet("/api/focus", GetFocusAsync);
    }

    private static async Task<IResult> GetFocusAsync(
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (context.Items["Role"] is not UserRole role
            || role == UserRole.Guest)
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var userId = (int)context.Items["UserId"]!;

        var tasks = await db.TaskItems
            .AsNoTracking()
            .Include(t => t.Category)
            .Include(t => t.Subtasks)
            .Where(t => t.AssigneeId == userId
                && (t.Status == TaskItemStatus.Open || t.Status == TaskItemStatus.InProgress))
            .OrderByDescending(t => t.Priority == Priority.High ? 2 : t.Priority == Priority.Medium ? 1 : 0)
            .ThenBy(t => t.DueDate.HasValue ? 0 : 1)
            .ThenBy(t => t.DueDate)
            .Take(3)
            .Select(t => new FocusTaskDto
            {
                Id = t.Id,
                Title = t.Title,
                Status = t.Status,
                Priority = t.Priority,
                CategoryId = t.CategoryId,
                CategoryName = t.Category != null ? t.Category.Name : null,
                CategoryColor = t.Category != null ? t.Category.Color : null,
                DueDate = t.DueDate,
                SubTaskCount = t.Subtasks.Count,
                SubTaskDoneCount = t.Subtasks.Count(s => s.Status == TaskItemStatus.Done)
            })
            .ToListAsync(ct);

        return Results.Ok(tasks);
    }
}
