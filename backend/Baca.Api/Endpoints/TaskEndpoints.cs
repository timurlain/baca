using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Baca.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks");

        group.MapGet("/", GetAllAsync);
        group.MapGet("/{id:int}", GetByIdAsync);
        group.MapPost("/", CreateAsync);
        group.MapPut("/{id:int}", UpdateAsync);
        group.MapPatch("/{id:int}/status", ChangeStatusAsync);
        group.MapPatch("/{id:int}/sort", ChangeSortAsync);
        group.MapPatch("/{id:int}/assign-me", AssignMeAsync);
        group.MapDelete("/{id:int}", DeleteAsync);
    }

    private static async Task<IResult> GetAllAsync(
        HttpContext context,
        BacaDbContext db,
        TaskItemStatus? status,
        int? category,
        int? assignee,
        string? search,
        int? parentId,
        CancellationToken ct)
    {
        if (!RequireAuth(context))
            return Results.Unauthorized();

        var query = db.TaskItems
            .AsNoTracking()
            .Include(t => t.Category)
            .Include(t => t.Assignee)
            .Include(t => t.CreatedBy)
            .AsQueryable();

        if (status is not null)
            query = query.Where(t => t.Status == status);

        if (category is not null)
            query = query.Where(t => t.CategoryId == category);

        if (assignee is not null)
            query = query.Where(t => t.AssigneeId == assignee);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => EF.Functions.ILike(t.Title, $"%{search}%"));

        if (parentId is not null)
            query = query.Where(t => t.ParentTaskId == parentId);
        else
            query = query.Where(t => t.ParentTaskId == null);

        var tasks = await query
            .OrderBy(t => t.SortOrder)
            .Select(t => ToDto(t))
            .ToListAsync(ct);

        return Results.Ok(tasks);
    }

    private static async Task<IResult> GetByIdAsync(
        int id,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!RequireAuth(context))
            return Results.Unauthorized();

        var task = await db.TaskItems
            .AsNoTracking()
            .Include(t => t.Category)
            .Include(t => t.Assignee)
            .Include(t => t.CreatedBy)
            .Include(t => t.ParentTask)
            .Include(t => t.Subtasks).ThenInclude(s => s.Category)
            .Include(t => t.Subtasks).ThenInclude(s => s.Assignee)
            .Include(t => t.Subtasks).ThenInclude(s => s.CreatedBy)
            .Include(t => t.Comments).ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (task is null)
            return Results.NotFound();

        var detail = new TaskDetailDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            Status = task.Status,
            Priority = task.Priority,
            CategoryId = task.CategoryId,
            CategoryName = task.Category?.Name,
            CategoryColor = task.Category?.Color,
            AssigneeId = task.AssigneeId,
            AssigneeName = task.Assignee?.Name,
            AssigneeAvatarColor = task.Assignee?.AvatarColor,
            ParentTaskId = task.ParentTaskId,
            ParentTaskTitle = task.ParentTask?.Title,
            DueDate = task.DueDate,
            SortOrder = task.SortOrder,
            CreatedById = task.CreatedById,
            CreatedByName = task.CreatedBy.Name,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            Subtasks = task.Subtasks.OrderBy(s => s.SortOrder).Select(s => ToDto(s)).ToList(),
            Comments = task.Comments.OrderBy(c => c.CreatedAt).Select(c => new CommentDto
            {
                Id = c.Id,
                TaskId = c.TaskId,
                AuthorId = c.AuthorId,
                AuthorName = c.Author.Name,
                AuthorAvatarColor = c.Author.AvatarColor,
                Text = c.Text,
                CreatedAt = c.CreatedAt
            }).ToList()
        };

        return Results.Ok(detail);
    }

    private static async Task<IResult> CreateAsync(
        CreateTaskRequest request,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!RequireRole(context, UserRole.User, UserRole.Admin))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var userId = GetUserId(context);

        var maxSort = await db.TaskItems
            .Where(t => t.Status == (request.Status ?? TaskItemStatus.Open) && t.ParentTaskId == request.ParentTaskId)
            .MaxAsync(t => (int?)t.SortOrder, ct) ?? 0;

        var task = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            Status = request.Status ?? TaskItemStatus.Open,
            Priority = request.Priority ?? Priority.Medium,
            CategoryId = request.CategoryId,
            AssigneeId = request.AssigneeId,
            ParentTaskId = request.ParentTaskId,
            DueDate = request.DueDate,
            SortOrder = maxSort + 1,
            CreatedById = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.TaskItems.Add(task);
        await db.SaveChangesAsync(ct);

        await db.Entry(task).Reference(t => t.CreatedBy).LoadAsync(ct);
        if (task.CategoryId is not null)
            await db.Entry(task).Reference(t => t.Category).LoadAsync(ct);
        if (task.AssigneeId is not null)
            await db.Entry(task).Reference(t => t.Assignee).LoadAsync(ct);

        return Results.Created($"/api/tasks/{task.Id}", ToDto(task));
    }

    private static async Task<IResult> UpdateAsync(
        int id,
        UpdateTaskRequest request,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!RequireRole(context, UserRole.User, UserRole.Admin))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var task = await db.TaskItems.FindAsync([id], ct);
        if (task is null)
            return Results.NotFound();

        if (request.Title is not null) task.Title = request.Title;
        if (request.Description is not null) task.Description = request.Description;
        if (request.Status is not null) task.Status = request.Status.Value;
        if (request.Priority is not null) task.Priority = request.Priority.Value;
        if (request.CategoryId is not null) task.CategoryId = request.CategoryId;
        if (request.AssigneeId is not null) task.AssigneeId = request.AssigneeId;
        if (request.ParentTaskId is not null) task.ParentTaskId = request.ParentTaskId;
        if (request.DueDate is not null) task.DueDate = request.DueDate;

        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await db.Entry(task).Reference(t => t.CreatedBy).LoadAsync(ct);
        if (task.CategoryId is not null)
            await db.Entry(task).Reference(t => t.Category).LoadAsync(ct);
        if (task.AssigneeId is not null)
            await db.Entry(task).Reference(t => t.Assignee).LoadAsync(ct);

        return Results.Ok(ToDto(task));
    }

    private static async Task<IResult> ChangeStatusAsync(
        int id,
        StatusChangeRequest request,
        HttpContext context,
        BacaDbContext db,
        IWhatsAppNotificationService whatsApp,
        CancellationToken ct)
    {
        if (!RequireRole(context, UserRole.User, UserRole.Admin))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var task = await db.TaskItems
            .Include(t => t.Assignee)
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (task is null)
            return Results.NotFound();

        var oldStatus = task.Status;
        task.Status = request.Status;
        task.UpdatedAt = DateTime.UtcNow;

        if (request.SortOrder is not null)
        {
            await ReorderTasksAsync(db, task, request.Status, request.SortOrder.Value, ct);
        }
        else
        {
            var maxSort = await db.TaskItems
                .Where(t => t.Status == request.Status && t.Id != id && t.ParentTaskId == task.ParentTaskId)
                .MaxAsync(t => (int?)t.SortOrder, ct) ?? 0;
            task.SortOrder = maxSort + 1;
        }

        await db.SaveChangesAsync(ct);

        if (task.Assignee is not null && oldStatus != request.Status)
        {
            var currentUserId = GetUserId(context);
            if (task.AssigneeId != currentUserId)
            {
                var assignedBy = await db.Users.FindAsync([currentUserId], ct);
                if (assignedBy is not null)
                {
                    await whatsApp.SendTaskAssignedAsync(task, task.Assignee, assignedBy, ct);
                }
            }
        }

        return Results.Ok();
    }

    private static async Task<IResult> ChangeSortAsync(
        int id,
        SortChangeRequest request,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!RequireRole(context, UserRole.User, UserRole.Admin))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var task = await db.TaskItems.FindAsync([id], ct);
        if (task is null)
            return Results.NotFound();

        await ReorderTasksAsync(db, task, task.Status, request.SortOrder, ct);
        task.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return Results.Ok();
    }

    private static async Task<IResult> AssignMeAsync(
        int id,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!RequireRole(context, UserRole.User, UserRole.Admin))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var task = await db.TaskItems.FindAsync([id], ct);
        if (task is null)
            return Results.NotFound();

        var userId = GetUserId(context);
        task.AssigneeId = userId;
        task.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return Results.Ok();
    }

    private static async Task<IResult> DeleteAsync(
        int id,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!RequireRole(context, UserRole.User, UserRole.Admin))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var task = await db.TaskItems
            .Include(t => t.Subtasks)
                .ThenInclude(s => s.Comments)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (task is null)
            return Results.NotFound();

        db.TaskItems.Remove(task);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }

    private static async Task ReorderTasksAsync(
        BacaDbContext db,
        TaskItem task,
        TaskItemStatus targetStatus,
        int newSortOrder,
        CancellationToken ct)
    {
        var siblings = await db.TaskItems
            .Where(t => t.Status == targetStatus
                && t.ParentTaskId == task.ParentTaskId
                && t.Id != task.Id)
            .OrderBy(t => t.SortOrder)
            .ToListAsync(ct);

        var position = Math.Max(0, Math.Min(newSortOrder, siblings.Count));

        for (var i = 0; i < siblings.Count; i++)
        {
            var order = i < position ? i : i + 1;
            siblings[i].SortOrder = order;
        }

        task.SortOrder = position;
    }

    private static TaskDto ToDto(TaskItem t) => new()
    {
        Id = t.Id,
        Title = t.Title,
        Description = t.Description,
        Status = t.Status,
        Priority = t.Priority,
        CategoryId = t.CategoryId,
        CategoryName = t.Category?.Name,
        CategoryColor = t.Category?.Color,
        AssigneeId = t.AssigneeId,
        AssigneeName = t.Assignee?.Name,
        AssigneeAvatarColor = t.Assignee?.AvatarColor,
        ParentTaskId = t.ParentTaskId,
        DueDate = t.DueDate,
        SortOrder = t.SortOrder,
        CreatedById = t.CreatedById,
        CreatedByName = t.CreatedBy.Name,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
        SubTaskCount = t.Subtasks.Count,
        SubTaskDoneCount = t.Subtasks.Count(s => s.Status == TaskItemStatus.Done),
        CommentCount = t.Comments.Count
    };

    private static bool RequireAuth(HttpContext context)
        => context.Items.ContainsKey("UserId");

    private static bool RequireRole(HttpContext context, params UserRole[] roles)
    {
        if (context.Items["Role"] is not UserRole role)
            return false;
        return roles.Contains(role);
    }

    private static int GetUserId(HttpContext context)
        => (int)context.Items["UserId"]!;
}
