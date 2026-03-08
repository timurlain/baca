using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users");

        group.MapGet("/", () =>
            Results.StatusCode(501));

        group.MapPost("/", (CreateUserRequest request) =>
            Results.StatusCode(501));

        group.MapPut("/{id:int}", (int id, UpdateUserRequest request) =>
            Results.StatusCode(501));

        group.MapPost("/{id:int}/resend-link", (int id) =>
            Results.StatusCode(501));
    }
}
