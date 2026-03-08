using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/request-link", (LoginRequest request) =>
            Results.StatusCode(501));

        group.MapGet("/verify/{token}", (string token) =>
            Results.StatusCode(501));

        group.MapPost("/guest", (GuestLoginRequest request) =>
            Results.StatusCode(501));

        group.MapPost("/logout", () =>
            Results.StatusCode(501));

        group.MapGet("/me", () =>
            Results.StatusCode(501));
    }
}
