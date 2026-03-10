using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("/", GetCategoriesAsync);
        group.MapPost("/", CreateCategoryAsync);
        group.MapPut("/{id:int}", UpdateCategoryAsync);
        group.MapDelete("/{id:int}", DeleteCategoryAsync);
    }

    private static async Task<IResult> GetCategoriesAsync(
        BacaDbContext dbContext,
        CancellationToken ct)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .Select(category => new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Color = category.Color,
                SortOrder = category.SortOrder,
                CreatedAt = category.CreatedAt
            })
            .ToListAsync(ct);

        return TypedResults.Ok(categories);
    }

    private static async Task<IResult> CreateCategoryAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        CreateCategoryRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return Results.BadRequest("Název kategorie je povinný.");
        }

        if (!IsValidHexColor(request.Color))
        {
            return Results.BadRequest("Barva musí být ve formátu #RRGGBB.");
        }

        var duplicateExists = await dbContext.Categories
            .AnyAsync(category => EF.Functions.ILike(category.Name, name), ct);
        if (duplicateExists)
        {
            return Results.Conflict("Kategorie se stejným názvem už existuje.");
        }

        var nextSortOrder = await dbContext.Categories
            .Select(category => (int?)category.SortOrder)
            .MaxAsync(ct) ?? 0;

        var category = new Category
        {
            Name = name,
            Color = request.Color,
            SortOrder = nextSortOrder + 1
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/categories/{category.Id}", MapCategory(category));
    }

    private static async Task<IResult> UpdateCategoryAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        UpdateCategoryRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var category = await dbContext.Categories.FirstOrDefaultAsync(category => category.Id == id, ct);
        if (category is null)
        {
            return Results.NotFound();
        }

        if (request.Name is not null)
        {
            var normalizedName = NormalizeName(request.Name);
            if (normalizedName is null)
            {
                return Results.BadRequest("Název kategorie je povinný.");
            }

            var duplicateExists = await dbContext.Categories
                .AnyAsync(
                    existingCategory => existingCategory.Id != id
                        && EF.Functions.ILike(existingCategory.Name, normalizedName),
                    ct);
            if (duplicateExists)
            {
                return Results.Conflict("Kategorie se stejným názvem už existuje.");
            }

            category.Name = normalizedName;
        }

        if (request.Color is not null)
        {
            if (!IsValidHexColor(request.Color))
            {
                return Results.BadRequest("Barva musí být ve formátu #RRGGBB.");
            }

            category.Color = request.Color;
        }

        if (request.SortOrder.HasValue)
        {
            category.SortOrder = request.SortOrder.Value;
        }

        await dbContext.SaveChangesAsync(ct);
        return TypedResults.Ok(MapCategory(category));
    }

    private static async Task<IResult> DeleteCategoryAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var category = await dbContext.Categories.FirstOrDefaultAsync(category => category.Id == id, ct);
        if (category is null)
        {
            return Results.NotFound();
        }

        var hasTasks = await dbContext.TaskItems.AnyAsync(task => task.CategoryId == id, ct);
        if (hasTasks)
        {
            return Results.Conflict("Kategorii nelze smazat, protože obsahuje úkoly.");
        }

        category.IsDeleted = true;
        category.DeletedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
        return Results.Ok();
    }

    private static CategoryDto MapCategory(Category category)
    {
        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Color = category.Color,
            SortOrder = category.SortOrder,
            CreatedAt = category.CreatedAt
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
