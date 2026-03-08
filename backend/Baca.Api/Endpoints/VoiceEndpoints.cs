using Baca.Api.DTOs;
using Baca.Api.Services;

namespace Baca.Api.Endpoints;

public static class VoiceEndpoints
{
    public static void MapVoiceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/voice");

        group.MapPost("/transcribe", TranscribeAsync);

        group.MapPost("/parse", ParseAsync);
    }

    private static async Task<IResult> TranscribeAsync(
        HttpContext httpContext,
        HttpRequest request,
        IVoiceTranscriptionService transcriptionService,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsMember(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var form = await request.ReadFormAsync(ct);
        var audioFile = form.Files.GetFile("audio");
        if (audioFile is null)
        {
            return Results.BadRequest("Audio file is required.");
        }

        await using var audioStream = audioFile.OpenReadStream();
        var transcription = await transcriptionService.TranscribeAsync(
            audioStream,
            audioFile.ContentType,
            ct);

        return TypedResults.Ok(transcription);
    }

    private static async Task<IResult> ParseAsync(
        HttpContext httpContext,
        IVoiceParsingService voiceParsingService,
        VoiceParseRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsMember(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        if (string.IsNullOrWhiteSpace(request.Transcription))
        {
            return Results.BadRequest("Transcription is required.");
        }

        var response = await voiceParsingService.ParseTranscriptionAsync(request.Transcription.Trim(), ct);
        return TypedResults.Ok(response);
    }
}
