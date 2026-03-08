using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/settings");

        group.MapGet("/", () =>
            Results.StatusCode(501));

        group.MapPut("/", (UpdateSettingsRequest request) =>
            Results.StatusCode(501));
    }
}
