using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class VoiceEndpoints
{
    public static void MapVoiceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/voice");

        group.MapPost("/transcribe", (HttpRequest request) =>
            Results.StatusCode(501));

        group.MapPost("/parse", (VoiceParseRequest request) =>
            Results.StatusCode(501));
    }
}
