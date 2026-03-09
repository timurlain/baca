using Baca.Api.DTOs;

namespace Baca.Api.Services;

public interface IVoiceParsingService
{
    Task<VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct = default);
    Task<BulkParseResponse> ParseBulkTextAsync(string text, CancellationToken ct = default);
}
