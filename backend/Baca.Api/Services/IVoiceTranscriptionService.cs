namespace Baca.Api.Services;

public interface IVoiceTranscriptionService
{
    Task<string> TranscribeAsync(Stream audioStream, string contentType, CancellationToken ct = default);
}
