using Baca.Api.DTOs;

namespace Baca.Api.Services;

public interface IVoiceTranscriptionService
{
    Task<TranscriptionResult> TranscribeAsync(Stream audioStream, string contentType, CancellationToken ct = default);
}
