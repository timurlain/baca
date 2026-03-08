using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("/", () =>
            Results.StatusCode(501));

        group.MapPost("/", (CreateCategoryRequest request) =>
            Results.StatusCode(501));

        group.MapPut("/{id:int}", (int id, UpdateCategoryRequest request) =>
            Results.StatusCode(501));

        group.MapDelete("/{id:int}", (int id) =>
            Results.StatusCode(501));
    }
}
