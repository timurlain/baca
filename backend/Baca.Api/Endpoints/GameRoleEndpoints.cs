using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class GameRoleEndpoints
{
    public static void MapGameRoleEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/gameroles");

        group.MapGet("/", GetGameRolesAsync);
        group.MapPost("/", CreateGameRoleAsync);
        group.MapPut("/{id:int}", UpdateGameRoleAsync);
        group.MapDelete("/{id:int}", DeleteGameRoleAsync);
    }

    private static async Task<IResult> GetGameRolesAsync(
        BacaDbContext dbContext,
        CancellationToken ct)
    {
        var roles = await dbContext.GameRoles
            .AsNoTracking()
            .OrderBy(role => role.SortOrder)
            .ThenBy(role => role.Name)
            .Select(role => new GameRoleDto
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                Color = role.Color,
                SortOrder = role.SortOrder,
                CreatedAt = role.CreatedAt
            })
            .ToListAsync(ct);

        return TypedResults.Ok(roles);
    }

    private static async Task<IResult> CreateGameRoleAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        CreateGameRoleRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return Results.BadRequest("Název herní role je povinný.");
        }

        if (!IsValidHexColor(request.Color))
        {
            return Results.BadRequest("Barva musí být ve formátu #RRGGBB.");
        }

        var duplicateExists = await dbContext.GameRoles
            .AnyAsync(role => EF.Functions.ILike(role.Name, name), ct);
        if (duplicateExists)
        {
            return Results.Conflict("Herní role se stejným názvem už existuje.");
        }

        var nextSortOrder = await dbContext.GameRoles
            .Select(role => (int?)role.SortOrder)
            .MaxAsync(ct) ?? 0;

        var gameRole = new GameRole
        {
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Color = request.Color,
            SortOrder = nextSortOrder + 1
        };

        dbContext.GameRoles.Add(gameRole);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/gameroles/{gameRole.Id}", MapGameRole(gameRole));
    }

    private static async Task<IResult> UpdateGameRoleAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        UpdateGameRoleRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var gameRole = await dbContext.GameRoles.FirstOrDefaultAsync(role => role.Id == id, ct);
        if (gameRole is null)
        {
            return Results.NotFound();
        }

        if (request.Name is not null)
        {
            var normalizedName = NormalizeName(request.Name);
            if (normalizedName is null)
            {
                return Results.BadRequest("Název herní role je povinný.");
            }

            var duplicateExists = await dbContext.GameRoles
                .AnyAsync(
                    existingRole => existingRole.Id != id
                        && EF.Functions.ILike(existingRole.Name, normalizedName),
                    ct);
            if (duplicateExists)
            {
                return Results.Conflict("Herní role se stejným názvem už existuje.");
            }

            gameRole.Name = normalizedName;
        }

        if (request.Description is not null)
        {
            gameRole.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        }

        if (request.Color is not null)
        {
            if (!IsValidHexColor(request.Color))
            {
                return Results.BadRequest("Barva musí být ve formátu #RRGGBB.");
            }

            gameRole.Color = request.Color;
        }

        if (request.SortOrder.HasValue)
        {
            gameRole.SortOrder = request.SortOrder.Value;
        }

        await dbContext.SaveChangesAsync(ct);
        return TypedResults.Ok(MapGameRole(gameRole));
    }

    private static async Task<IResult> DeleteGameRoleAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var gameRole = await dbContext.GameRoles.FirstOrDefaultAsync(role => role.Id == id, ct);
        if (gameRole is null)
        {
            return Results.NotFound();
        }

        var hasUsers = await dbContext.Users.AnyAsync(user => user.GameRoleId == id, ct);
        if (hasUsers)
        {
            return Results.Conflict("Herní roli nelze smazat, protože má přiřazené uživatele.");
        }

        dbContext.GameRoles.Remove(gameRole);
        await dbContext.SaveChangesAsync(ct);
        return Results.Ok();
    }

    private static GameRoleDto MapGameRole(GameRole gameRole)
    {
        return new GameRoleDto
        {
            Id = gameRole.Id,
            Name = gameRole.Name,
            Description = gameRole.Description,
            Color = gameRole.Color,
            SortOrder = gameRole.SortOrder,
            CreatedAt = gameRole.CreatedAt
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
