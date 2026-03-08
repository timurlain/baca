using System.Diagnostics;
using Baca.Api.DTOs;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

namespace Baca.Api.Services;

public sealed class VoiceTranscriptionService(IConfiguration configuration) : IVoiceTranscriptionService
{
    public async Task<TranscriptionResult> TranscribeAsync(
        Stream audioStream,
        string contentType,
        CancellationToken ct = default)
    {
        var speechKey = configuration["Azure:Speech:Key"]
            ?? configuration["Azure__Speech__Key"]
            ?? throw new InvalidOperationException("Azure Speech key is not configured.");
        var speechRegion = configuration["Azure:Speech:Region"]
            ?? configuration["Azure__Speech__Region"]
            ?? throw new InvalidOperationException("Azure Speech region is not configured.");

        var temporaryDirectory = Path.Combine(Path.GetTempPath(), "baca-voice");
        Directory.CreateDirectory(temporaryDirectory);

        var inputExtension = GetInputExtension(contentType);
        var inputPath = Path.Combine(temporaryDirectory, $"{Guid.NewGuid():N}{inputExtension}");
        var wavPath = Path.Combine(temporaryDirectory, $"{Guid.NewGuid():N}.wav");

        await using (var fileStream = File.Create(inputPath))
        {
            await audioStream.CopyToAsync(fileStream, ct);
        }

        try
        {
            if (IsWaveContentType(contentType))
            {
                File.Move(inputPath, wavPath, overwrite: true);
            }
            else
            {
                await ConvertToWaveAsync(inputPath, wavPath, ct);
            }

            var speechConfig = SpeechConfig.FromSubscription(speechKey, speechRegion);
            speechConfig.SpeechRecognitionLanguage = "cs-CZ";

            using var audioConfig = AudioConfig.FromWavFileInput(wavPath);
            using var recognizer = new SpeechRecognizer(speechConfig, audioConfig);
            var result = await recognizer.RecognizeOnceAsync();

            return result.Reason switch
            {
                ResultReason.RecognizedSpeech when !string.IsNullOrWhiteSpace(result.Text) => new TranscriptionResult
                {
                    Transcription = result.Text.Trim()
                },
                ResultReason.NoMatch => throw new InvalidOperationException("Azure Speech did not recognize any speech."),
                ResultReason.Canceled => throw CreateSpeechCancellationException(result),
                _ => throw new InvalidOperationException("Azure Speech returned an unexpected recognition result.")
            };
        }
        finally
        {
            DeleteIfExists(inputPath);
            DeleteIfExists(wavPath);
        }
    }

    private static async Task ConvertToWaveAsync(string inputPath, string wavPath, CancellationToken ct)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = ResolveFfmpegPath(),
            Arguments = $"-y -i \"{inputPath}\" -ac 1 -ar 16000 -sample_fmt s16 \"{wavPath}\"",
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start ffmpeg for audio conversion.");
        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0 || !File.Exists(wavPath))
        {
            var errorText = await process.StandardError.ReadToEndAsync(ct);
            throw new InvalidOperationException($"Audio conversion to WAV failed: {errorText}");
        }
    }

    private static string ResolveFfmpegPath()
    {
        var candidates = OperatingSystem.IsWindows()
            ? new[] { "ffmpeg.exe", "ffmpeg" }
            : new[] { "ffmpeg" };

        foreach (var candidate in candidates)
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = candidate,
                    Arguments = "-version",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(startInfo);
                process?.Kill(entireProcessTree: true);
                return candidate;
            }
            catch
            {
                // Continue probing candidates.
            }
        }

        throw new InvalidOperationException("ffmpeg is required to transcribe non-WAV audio.");
    }

    private static InvalidOperationException CreateSpeechCancellationException(SpeechRecognitionResult result)
    {
        var details = CancellationDetails.FromResult(result);
        var errorDetails = string.IsNullOrWhiteSpace(details.ErrorDetails) ? "No details provided." : details.ErrorDetails;
        return new InvalidOperationException(
            $"Azure Speech canceled transcription: {details.Reason}. {errorDetails}");
    }

    private static string GetInputExtension(string contentType)
    {
        return contentType.ToLowerInvariant() switch
        {
            "audio/wav" or "audio/wave" or "audio/x-wav" => ".wav",
            "audio/webm" or "video/webm" or "audio/webm;codecs=opus" => ".webm",
            _ => ".audio"
        };
    }

    private static bool IsWaveContentType(string contentType)
    {
        return contentType.Equals("audio/wav", StringComparison.OrdinalIgnoreCase)
            || contentType.Equals("audio/wave", StringComparison.OrdinalIgnoreCase)
            || contentType.Equals("audio/x-wav", StringComparison.OrdinalIgnoreCase);
    }

    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
