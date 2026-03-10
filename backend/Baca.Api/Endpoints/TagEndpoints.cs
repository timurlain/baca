using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class TagEndpoints
{
    public static void MapTagEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tags");

        group.MapGet("/", GetTagsAsync);
        group.MapPost("/", CreateTagAsync);
        group.MapPut("/{id:int}", UpdateTagAsync);
        group.MapDelete("/{id:int}", DeleteTagAsync);
    }

    private static async Task<IResult> GetTagsAsync(
        BacaDbContext dbContext,
        CancellationToken ct)
    {
        var tags = await dbContext.Tags
            .AsNoTracking()
            .OrderBy(tag => tag.Name)
            .Select(tag => new TagDto
            {
                Id = tag.Id,
                Name = tag.Name,
                Color = tag.Color,
                CreatedAt = tag.CreatedAt
            })
            .ToListAsync(ct);

        return TypedResults.Ok(tags);
    }

    private static async Task<IResult> CreateTagAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        CreateTagRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsMember(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return Results.BadRequest("Název značky je povinný.");
        }

        if (!IsValidHexColor(request.Color))
        {
            return Results.BadRequest("Barva musí být ve formátu #RRGGBB.");
        }

        var duplicateExists = await dbContext.Tags
            .AnyAsync(tag => EF.Functions.ILike(tag.Name, name), ct);
        if (duplicateExists)
        {
            return Results.Conflict("Značka se stejným názvem už existuje.");
        }

        var tag = new Tag
        {
            Name = name,
            Color = request.Color
        };

        dbContext.Tags.Add(tag);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/tags/{tag.Id}", MapTag(tag));
    }

    private static async Task<IResult> UpdateTagAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        UpdateTagRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var tag = await dbContext.Tags.FirstOrDefaultAsync(tag => tag.Id == id, ct);
        if (tag is null)
        {
            return Results.NotFound();
        }

        if (request.Name is not null)
        {
            var normalizedName = NormalizeName(request.Name);
            if (normalizedName is null)
            {
                return Results.BadRequest("Název značky je povinný.");
            }

            var duplicateExists = await dbContext.Tags
                .AnyAsync(
                    existingTag => existingTag.Id != id
                        && EF.Functions.ILike(existingTag.Name, normalizedName),
                    ct);
            if (duplicateExists)
            {
                return Results.Conflict("Značka se stejným názvem už existuje.");
            }

            tag.Name = normalizedName;
        }

        if (request.Color is not null)
        {
            if (!IsValidHexColor(request.Color))
            {
                return Results.BadRequest("Barva musí být ve formátu #RRGGBB.");
            }

            tag.Color = request.Color;
        }

        await dbContext.SaveChangesAsync(ct);
        return TypedResults.Ok(MapTag(tag));
    }

    private static async Task<IResult> DeleteTagAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var tag = await dbContext.Tags.FirstOrDefaultAsync(tag => tag.Id == id, ct);
        if (tag is null)
        {
            return Results.NotFound();
        }

        tag.IsDeleted = true;
        tag.DeletedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
        return Results.Ok();
    }

    private static TagDto MapTag(Tag tag)
    {
        return new TagDto
        {
            Id = tag.Id,
            Name = tag.Name,
            Color = tag.Color,
            CreatedAt = tag.CreatedAt
        };
    }

    private static string? NormalizeName(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static bool IsValidHexColor(string value)
    {
        return value.Length == 7
            && value[0] == '#'
            && value.Skip(1).All(Uri.IsHexDigit);
    }
}
