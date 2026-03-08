namespace Baca.Api.Endpoints;

public static class FocusEndpoints
{
    public static void MapFocusEndpoints(this WebApplication app)
    {
        app.MapGet("/api/focus", () =>
            Results.StatusCode(501));
    }
}
