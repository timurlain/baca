using Baca.Api.Data;
using Baca.Api.Models;
using Baca.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class ImageEndpoints
{
    private static readonly HashSet<string> AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxFileSize = 5 * 1024 * 1024; // 5 MB

    public static void MapImageEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks/{taskId:int}/images").RequireAuthorization();

        group.MapGet("/", async (int taskId, BacaDbContext db, IBlobStorageService blob) =>
        {
            var images = await db.TaskImages
                .Where(i => i.TaskId == taskId)
                .OrderBy(i => i.UploadedAt)
                .Select(i => new { i.Id, i.FileName, i.BlobKey })
                .ToListAsync();

            var result = await Task.WhenAll(images.Select(async img =>
            {
                var url = await blob.GetSasUrlAsync(img.BlobKey);
                return new TaskImageDto(img.Id, img.FileName, url);
            }));

            return Results.Ok(result);
        });

        group.MapPost("/", async (int taskId, IFormFile file, BacaDbContext db, IBlobStorageService blob, HttpContext context) =>
        {
            var userId = context.Items["UserId"] as int?;
            if (userId is null) return Results.Unauthorized();
            var role = context.Items["Role"] as Baca.Api.Models.UserRole?;
            if (role == Baca.Api.Models.UserRole.Guest) return Results.Forbid();

            if (file.Length == 0) return Results.BadRequest("Prázdný soubor.");
            if (file.Length > MaxFileSize) return Results.BadRequest("Soubor je příliš velký (max 5 MB).");
            if (!AllowedContentTypes.Contains(file.ContentType)) return Results.BadRequest("Povolené formáty: JPEG, PNG, WebP.");

            var task = await db.TaskItems.FindAsync(taskId);
            if (task is null) return Results.NotFound();

            var ext = Path.GetExtension(file.FileName).TrimStart('.');
            var blobKey = $"tasks/{taskId}/{Guid.NewGuid()}.{ext}";

            await using var stream = file.OpenReadStream();
            await blob.UploadAsync(blobKey, stream, file.ContentType);

            var image = new TaskImage
            {
                TaskId = taskId,
                BlobKey = blobKey,
                FileName = file.FileName,
                ContentType = file.ContentType,
                UploadedById = userId.Value,
            };
            db.TaskImages.Add(image);
            await db.SaveChangesAsync();

            var url = await blob.GetSasUrlAsync(blobKey);
            return Results.Created($"/api/tasks/{taskId}/images/{image.Id}",
                new TaskImageDto(image.Id, image.FileName, url));
        }).DisableAntiforgery();

        group.MapDelete("/{imageId:int}", async (int taskId, int imageId, BacaDbContext db, IBlobStorageService blob, HttpContext context) =>
        {
            var userId = context.Items["UserId"] as int?;
            if (userId is null) return Results.Unauthorized();
            var role = context.Items["Role"] as Baca.Api.Models.UserRole?;
            if (role == Baca.Api.Models.UserRole.Guest) return Results.Forbid();

            var image = await db.TaskImages.FirstOrDefaultAsync(i => i.Id == imageId && i.TaskId == taskId);
            if (image is null) return Results.NotFound();

            await blob.DeleteAsync(image.BlobKey);
            db.TaskImages.Remove(image);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}

public record TaskImageDto(int Id, string FileName, string? Url);
