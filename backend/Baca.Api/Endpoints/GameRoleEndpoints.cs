using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class GameRoleEndpoints
{
    public static void MapGameRoleEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/gameroles");

        group.MapGet("/", () =>
            Results.StatusCode(501));

        group.MapPost("/", (CreateGameRoleRequest request) =>
            Results.StatusCode(501));

        group.MapPut("/{id:int}", (int id, UpdateGameRoleRequest request) =>
            Results.StatusCode(501));

        group.MapDelete("/{id:int}", (int id) =>
            Results.StatusCode(501));
    }
}
