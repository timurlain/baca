using Baca.Api.DTOs;
using Baca.Api.Services;

namespace Baca.Api.Endpoints;

public static class VoiceEndpoints
{
    private static readonly Action<ILogger, string, string, long, Exception?> LogTranscribeRequest =
        LoggerMessage.Define<string, string, long>(LogLevel.Information,
            new EventId(1, nameof(LogTranscribeRequest)),
            "Transcribe request: FileName={FileName}, ContentType={ContentType}, Length={Length}");

    private static readonly Action<ILogger, string, Exception?> LogTranscribeSuccess =
        LoggerMessage.Define<string>(LogLevel.Information,
            new EventId(2, nameof(LogTranscribeSuccess)),
            "Transcription successful: '{Text}'");

    private static readonly Action<ILogger, Exception?> LogTranscribeFailed =
        LoggerMessage.Define(LogLevel.Error,
            new EventId(3, nameof(LogTranscribeFailed)),
            "Transcription failed");

    private static readonly Action<ILogger, Exception?> LogTranscribeNoFile =
        LoggerMessage.Define(LogLevel.Warning,
            new EventId(4, nameof(LogTranscribeNoFile)),
            "Transcribe called without audio file");

    private static readonly Action<ILogger, string, Exception?> LogParseRequest =
        LoggerMessage.Define<string>(LogLevel.Information,
            new EventId(5, nameof(LogParseRequest)),
            "Parse request: Transcription='{Transcription}'");

    private static readonly Action<ILogger, string?, Exception?> LogParseSuccess =
        LoggerMessage.Define<string?>(LogLevel.Information,
            new EventId(6, nameof(LogParseSuccess)),
            "Parse successful: Title='{Title}'");

    private static readonly Action<ILogger, Exception?> LogParseAiNotConfigured =
        LoggerMessage.Define(LogLevel.Error,
            new EventId(7, nameof(LogParseAiNotConfigured)),
            "AI service not configured");

    private static readonly Action<ILogger, Exception?> LogParseConnectionFailed =
        LoggerMessage.Define(LogLevel.Error,
            new EventId(8, nameof(LogParseConnectionFailed)),
            "Failed to connect to AI service");

    private static readonly Action<ILogger, Exception?> LogParseFailed =
        LoggerMessage.Define(LogLevel.Error,
            new EventId(9, nameof(LogParseFailed)),
            "Parse failed unexpectedly");

    private static readonly Action<ILogger, int, Exception?> LogBulkParseRequest =
        LoggerMessage.Define<int>(LogLevel.Information,
            new EventId(10, nameof(LogBulkParseRequest)),
            "BulkParse request: TextLength={Length}");

    private static readonly Action<ILogger, int, Exception?> LogBulkParseSuccess =
        LoggerMessage.Define<int>(LogLevel.Information,
            new EventId(11, nameof(LogBulkParseSuccess)),
            "BulkParse successful: {Count} tasks extracted");

    public static void MapVoiceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/voice");

        group.MapPost("/transcribe", TranscribeAsync);
        group.MapPost("/parse", ParseAsync);
        group.MapPost("/parse-bulk", ParseBulkAsync);
    }

    private static async Task<IResult> TranscribeAsync(
        HttpContext httpContext,
        HttpRequest request,
        IVoiceTranscriptionService transcriptionService,
        ILogger<VoiceTranscriptionService> logger,
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
            LogTranscribeNoFile(logger, null);
            return Results.BadRequest("Audio file is required.");
        }

        LogTranscribeRequest(logger, audioFile.FileName, audioFile.ContentType, audioFile.Length, null);

        try
        {
            await using var audioStream = audioFile.OpenReadStream();
            var transcription = await transcriptionService.TranscribeAsync(
                audioStream,
                audioFile.ContentType,
                ct);

            LogTranscribeSuccess(logger, transcription.Transcription, null);
            return TypedResults.Ok(transcription);
        }
        catch (Exception ex)
        {
            LogTranscribeFailed(logger, ex);
            return Results.Problem($"Přepis hlasu selhal: {ex.Message}", statusCode: 500);
        }
    }

    private static async Task<IResult> ParseAsync(
        HttpContext httpContext,
        IVoiceParsingService voiceParsingService,
        ILogger<VoiceParsingService> logger,
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

        var trimmed = request.Transcription.Trim();
        LogParseRequest(logger, trimmed, null);

        try
        {
            var response = await voiceParsingService.ParseTranscriptionAsync(trimmed, ct);
            LogParseSuccess(logger, response.Title, null);
            return TypedResults.Ok(response);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key", StringComparison.OrdinalIgnoreCase))
        {
            LogParseAiNotConfigured(logger, ex);
            return Results.Problem("AI služba není nakonfigurována. Kontaktujte administrátora.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            LogParseConnectionFailed(logger, ex);
            return Results.Problem("Nepodařilo se spojit s AI službou. Zkuste to později.", statusCode: 502);
        }
        catch (Exception ex)
        {
            LogParseFailed(logger, ex);
            return Results.Problem($"Zpracování přepisu selhalo: {ex.Message}", statusCode: 500);
        }
    }

    private static async Task<IResult> ParseBulkAsync(
        HttpContext httpContext,
        IVoiceParsingService voiceParsingService,
        ILogger<VoiceParsingService> logger,
        BulkParseRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsMember(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return Results.BadRequest("Text is required.");
        }

        var trimmed = request.Text.Trim();
        LogBulkParseRequest(logger, trimmed.Length, null);

        try
        {
            var response = await voiceParsingService.ParseBulkTextAsync(trimmed, ct);
            LogBulkParseSuccess(logger, response.Tasks.Count, null);
            return TypedResults.Ok(response);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key", StringComparison.OrdinalIgnoreCase))
        {
            LogParseAiNotConfigured(logger, ex);
            return Results.Problem("AI služba není nakonfigurována. Kontaktujte administrátora.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            LogParseConnectionFailed(logger, ex);
            return Results.Problem("Nepodařilo se spojit s AI službou. Zkuste to později.", statusCode: 502);
        }
        catch (Exception ex)
        {
            LogParseFailed(logger, ex);
            return Results.Problem($"Hromadné zpracování selhalo: {ex.Message}", statusCode: 500);
        }
    }
}
