using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class CommentEndpoints
{
    public static void MapCommentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks/{taskId:int}/comments");

        group.MapGet("/", GetCommentsAsync);
        group.MapPost("/", CreateCommentAsync);
    }

    private static async Task<IResult> GetCommentsAsync(
        int taskId,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!context.Items.ContainsKey("UserId"))
            return Results.Unauthorized();

        var taskExists = await db.TaskItems.AnyAsync(t => t.Id == taskId, ct);
        if (!taskExists)
            return Results.NotFound();

        var comments = await db.Comments
            .AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.TaskId == taskId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                TaskId = c.TaskId,
                AuthorId = c.AuthorId,
                AuthorName = c.Author.Name,
                AuthorAvatarColor = c.Author.AvatarColor,
                Text = c.Text,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(ct);

        return Results.Ok(comments);
    }

    private static async Task<IResult> CreateCommentAsync(
        int taskId,
        CreateCommentRequest request,
        HttpContext context,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (context.Items["Role"] is not UserRole role
            || role == UserRole.Guest)
            return Results.Forbid();

        var taskExists = await db.TaskItems.AnyAsync(t => t.Id == taskId, ct);
        if (!taskExists)
            return Results.NotFound();

        var userId = (int)context.Items["UserId"]!;

        var comment = new Comment
        {
            TaskId = taskId,
            AuthorId = userId,
            Text = request.Text,
            CreatedAt = DateTime.UtcNow
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(ct);

        await db.Entry(comment).Reference(c => c.Author).LoadAsync(ct);

        var dto = new CommentDto
        {
            Id = comment.Id,
            TaskId = comment.TaskId,
            AuthorId = comment.AuthorId,
            AuthorName = comment.Author.Name,
            AuthorAvatarColor = comment.Author.AvatarColor,
            Text = comment.Text,
            CreatedAt = comment.CreatedAt
        };

        return Results.Created($"/api/tasks/{taskId}/comments/{comment.Id}", dto);
    }
}
