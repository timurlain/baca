using Baca.Api.Data;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class TrashEndpoints
{
    public static void MapTrashEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin/trash");

        group.MapGet("/", GetAllDeletedAsync);
        group.MapPost("/{entity}/{id:int}/restore", RestoreAsync);
        group.MapDelete("/{entity}/{id:int}", PermanentDeleteAsync);
    }

    private static async Task<IResult> GetAllDeletedAsync(
        HttpContext httpContext,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var tasks = await db.TaskItems
            .IgnoreQueryFilters()
            .Where(t => t.IsDeleted)
            .OrderByDescending(t => t.DeletedAt)
            .Select(t => new DeletedItemDto
            {
                Entity = "task",
                Id = t.Id,
                Name = t.Title,
                DeletedAt = t.DeletedAt ?? t.UpdatedAt,
            })
            .ToListAsync(ct);

        var categories = await db.Categories
            .IgnoreQueryFilters()
            .Where(c => c.IsDeleted)
            .OrderByDescending(c => c.DeletedAt)
            .Select(c => new DeletedItemDto
            {
                Entity = "category",
                Id = c.Id,
                Name = c.Name,
                DeletedAt = c.DeletedAt ?? c.CreatedAt,
            })
            .ToListAsync(ct);

        var tags = await db.Tags
            .IgnoreQueryFilters()
            .Where(t => t.IsDeleted)
            .OrderByDescending(t => t.DeletedAt)
            .Select(t => new DeletedItemDto
            {
                Entity = "tag",
                Id = t.Id,
                Name = t.Name,
                DeletedAt = t.DeletedAt ?? t.CreatedAt,
            })
            .ToListAsync(ct);

        var users = await db.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsDeleted)
            .OrderByDescending(u => u.DeletedAt)
            .Select(u => new DeletedItemDto
            {
                Entity = "user",
                Id = u.Id,
                Name = u.Name,
                DeletedAt = u.DeletedAt ?? u.CreatedAt,
            })
            .ToListAsync(ct);

        var gameRoles = await db.GameRoles
            .IgnoreQueryFilters()
            .Where(gr => gr.IsDeleted)
            .OrderByDescending(gr => gr.DeletedAt)
            .Select(gr => new DeletedItemDto
            {
                Entity = "gamerole",
                Id = gr.Id,
                Name = gr.Name,
                DeletedAt = gr.DeletedAt ?? gr.CreatedAt,
            })
            .ToListAsync(ct);

        var all = tasks
            .Concat(categories)
            .Concat(tags)
            .Concat(users)
            .Concat(gameRoles)
            .OrderByDescending(d => d.DeletedAt)
            .ToList();

        return Results.Ok(all);
    }

    private static async Task<IResult> RestoreAsync(
        string entity,
        int id,
        HttpContext httpContext,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        switch (entity.ToLowerInvariant())
        {
            case "task":
            {
                var task = await db.TaskItems.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == id && t.IsDeleted, ct);
                if (task is null) return Results.NotFound();
                task.IsDeleted = false;
                task.DeletedAt = null;
                break;
            }
            case "category":
            {
                var cat = await db.Categories.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.Id == id && c.IsDeleted, ct);
                if (cat is null) return Results.NotFound();
                cat.IsDeleted = false;
                cat.DeletedAt = null;
                break;
            }
            case "tag":
            {
                var tag = await db.Tags.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == id && t.IsDeleted, ct);
                if (tag is null) return Results.NotFound();
                tag.IsDeleted = false;
                tag.DeletedAt = null;
                break;
            }
            case "user":
            {
                var user = await db.Users.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == id && u.IsDeleted, ct);
                if (user is null) return Results.NotFound();
                user.IsDeleted = false;
                user.DeletedAt = null;
                user.IsActive = true;
                break;
            }
            case "gamerole":
            {
                var role = await db.GameRoles.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(gr => gr.Id == id && gr.IsDeleted, ct);
                if (role is null) return Results.NotFound();
                role.IsDeleted = false;
                role.DeletedAt = null;
                break;
            }
            default:
                return Results.BadRequest($"Unknown entity type: {entity}");
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok();
    }

    private static async Task<IResult> PermanentDeleteAsync(
        string entity,
        int id,
        HttpContext httpContext,
        BacaDbContext db,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        int deleted;
        switch (entity.ToLowerInvariant())
        {
            case "task":
                deleted = await db.TaskItems.IgnoreQueryFilters()
                    .Where(t => t.Id == id && t.IsDeleted)
                    .ExecuteDeleteAsync(ct);
                break;
            case "category":
                deleted = await db.Categories.IgnoreQueryFilters()
                    .Where(c => c.Id == id && c.IsDeleted)
                    .ExecuteDeleteAsync(ct);
                break;
            case "tag":
                deleted = await db.Tags.IgnoreQueryFilters()
                    .Where(t => t.Id == id && t.IsDeleted)
                    .ExecuteDeleteAsync(ct);
                break;
            case "user":
                deleted = await db.Users.IgnoreQueryFilters()
                    .Where(u => u.Id == id && u.IsDeleted)
                    .ExecuteDeleteAsync(ct);
                break;
            case "gamerole":
                deleted = await db.GameRoles.IgnoreQueryFilters()
                    .Where(gr => gr.Id == id && gr.IsDeleted)
                    .ExecuteDeleteAsync(ct);
                break;
            default:
                return Results.BadRequest($"Unknown entity type: {entity}");
        }

        return deleted > 0 ? Results.NoContent() : Results.NotFound();
    }
}

public class DeletedItemDto
{
    public required string Entity { get; set; }
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime DeletedAt { get; set; }
}
