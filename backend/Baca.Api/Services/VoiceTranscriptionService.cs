using System.Diagnostics;
using Baca.Api.DTOs;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

namespace Baca.Api.Services;

public sealed partial class VoiceTranscriptionService(
    IConfiguration configuration,
    ILogger<VoiceTranscriptionService> logger) : IVoiceTranscriptionService
{
    public async Task<TranscriptionResult> TranscribeAsync(
        Stream audioStream,
        string contentType,
        CancellationToken ct = default)
    {
        LogTranscribeStarted(contentType, audioStream.CanSeek ? audioStream.Length : -1);

        var speechKey = configuration["Azure:Speech:Key"]
            ?? configuration["Azure__Speech__Key"]
            ?? throw new InvalidOperationException("Azure Speech key is not configured.");
        var speechRegion = configuration["Azure:Speech:Region"]
            ?? configuration["Azure__Speech__Region"]
            ?? throw new InvalidOperationException("Azure Speech region is not configured.");

        LogSpeechConfig(speechRegion, speechKey.Length);

        var temporaryDirectory = Path.Combine(Path.GetTempPath(), "baca-voice");
        Directory.CreateDirectory(temporaryDirectory);

        var inputExtension = GetInputExtension(contentType);
        var inputPath = Path.Combine(temporaryDirectory, $"{Guid.NewGuid():N}{inputExtension}");
        var wavPath = Path.Combine(temporaryDirectory, $"{Guid.NewGuid():N}.wav");

        LogSavingAudio(inputPath, inputExtension);

        await using (var fileStream = File.Create(inputPath))
        {
            await audioStream.CopyToAsync(fileStream, ct);
        }

        var inputFileSize = new FileInfo(inputPath).Length;
        LogAudioSaved(inputFileSize);

        if (inputFileSize == 0)
        {
            LogEmptyAudio();
            throw new InvalidOperationException("Audio file is empty.");
        }

        try
        {
            if (IsWaveContentType(contentType))
            {
                LogAlreadyWav(wavPath);
                File.Move(inputPath, wavPath, overwrite: true);
            }
            else
            {
                LogConvertingAudio(contentType);
                await ConvertToWaveAsync(inputPath, wavPath, ct);
                var wavSize = new FileInfo(wavPath).Length;
                LogConversionComplete(wavSize);
            }

            LogCreatingRecognizer();
            var speechConfig = SpeechConfig.FromSubscription(speechKey, speechRegion);
            speechConfig.SpeechRecognitionLanguage = "cs-CZ";

            using var audioConfig = AudioConfig.FromWavFileInput(wavPath);
            using var recognizer = new SpeechRecognizer(speechConfig, audioConfig);

            LogRecognizing();

            var segments = new List<string>();
            var sessionStopped = new TaskCompletionSource<bool>();
            CancellationDetails? cancelDetails = null;

            recognizer.Recognized += (_, e) =>
            {
                var reason = e.Result.Reason.ToString();
                LogRecognitionResult(reason, e.Result.Text);
                if (e.Result.Reason == ResultReason.RecognizedSpeech
                    && !string.IsNullOrWhiteSpace(e.Result.Text))
                {
                    segments.Add(e.Result.Text.Trim());
                }
            };

            recognizer.Canceled += (_, e) =>
            {
                var cancelReason = e.Reason.ToString();
                LogCanceled(cancelReason, e.ErrorDetails ?? "(none)");
                if (e.Reason == CancellationReason.Error)
                {
                    cancelDetails = CancellationDetails.FromResult(e.Result);
                }
                sessionStopped.TrySetResult(true);
            };

            recognizer.SessionStopped += (_, _) =>
            {
                LogSessionStopped();
                sessionStopped.TrySetResult(true);
            };

            await recognizer.StartContinuousRecognitionAsync();

            // Wait for the file to be fully processed or cancellation
            using (ct.Register(() => sessionStopped.TrySetCanceled()))
            {
                await sessionStopped.Task;
            }

            await recognizer.StopContinuousRecognitionAsync();

            if (cancelDetails is not null)
            {
                var errorDetails = string.IsNullOrWhiteSpace(cancelDetails.ErrorDetails)
                    ? "No details provided."
                    : cancelDetails.ErrorDetails;
                throw new InvalidOperationException(
                    $"Azure Speech canceled transcription: {cancelDetails.Reason}. {errorDetails}");
            }

            var fullText = string.Join(" ", segments);
            LogFullTranscription(fullText, segments.Count);

            if (string.IsNullOrWhiteSpace(fullText))
            {
                throw new InvalidOperationException("Azure Speech did not recognize any speech.");
            }

            return new TranscriptionResult { Transcription = fullText };
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            LogTranscriptionError(ex);
            throw;
        }
        finally
        {
            DeleteIfExists(inputPath);
            DeleteIfExists(wavPath);
        }
    }

    private async Task ConvertToWaveAsync(string inputPath, string wavPath, CancellationToken ct)
    {
        var ffmpegPath = ResolveFfmpegPath();
        var arguments = $"-y -i \"{inputPath}\" -ac 1 -ar 16000 -sample_fmt s16 \"{wavPath}\"";
        LogFfmpegCommand(ffmpegPath, arguments);

        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            Arguments = arguments,
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
            LogFfmpegFailed(process.ExitCode, errorText);
            throw new InvalidOperationException($"Audio conversion to WAV failed: {errorText}");
        }

        LogFfmpegSuccess();
    }

    private string ResolveFfmpegPath()
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
                LogFfmpegResolved(candidate);
                return candidate;
            }
            catch
            {
                LogFfmpegCandidateNotFound(candidate);
            }
        }

        LogFfmpegNotFound();
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

    // LoggerMessage source-generated delegates
    [LoggerMessage(Level = LogLevel.Debug, Message = "TranscribeAsync started. ContentType={ContentType}, StreamLength={Length}")]
    private partial void LogTranscribeStarted(string contentType, long length);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Azure Speech config: Region={Region}, KeyLength={KeyLength}")]
    private partial void LogSpeechConfig(string region, int keyLength);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Saving audio to {InputPath} (ext={Extension})")]
    private partial void LogSavingAudio(string inputPath, string extension);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Audio file saved: {Size} bytes")]
    private partial void LogAudioSaved(long size);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Audio file is empty (0 bytes). Aborting transcription.")]
    private partial void LogEmptyAudio();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Audio is already WAV, moving to {WavPath}")]
    private partial void LogAlreadyWav(string wavPath);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Converting {ContentType} to WAV via ffmpeg")]
    private partial void LogConvertingAudio(string contentType);

    [LoggerMessage(Level = LogLevel.Debug, Message = "WAV conversion complete: {Size} bytes")]
    private partial void LogConversionComplete(long size);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Creating SpeechRecognizer (language=cs-CZ)")]
    private partial void LogCreatingRecognizer();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Starting continuous recognition...")]
    private partial void LogRecognizing();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Recognized segment: Reason={Reason}, Text='{Text}'")]
    private partial void LogRecognitionResult(string reason, string text);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Recognition canceled: Reason={Reason}, Details='{Details}'")]
    private partial void LogCanceled(string reason, string details);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Recognition session stopped")]
    private partial void LogSessionStopped();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Full transcription: '{Text}' ({SegmentCount} segments)")]
    private partial void LogFullTranscription(string text, int segmentCount);

    [LoggerMessage(Level = LogLevel.Error, Message = "Unexpected error during transcription")]
    private partial void LogTranscriptionError(Exception ex);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Running ffmpeg: {Path} {Args}")]
    private partial void LogFfmpegCommand(string path, string args);

    [LoggerMessage(Level = LogLevel.Error, Message = "ffmpeg failed (exit={ExitCode}): {Error}")]
    private partial void LogFfmpegFailed(int exitCode, string error);

    [LoggerMessage(Level = LogLevel.Debug, Message = "ffmpeg completed successfully (exit=0)")]
    private partial void LogFfmpegSuccess();

    [LoggerMessage(Level = LogLevel.Debug, Message = "ffmpeg resolved at: {Path}")]
    private partial void LogFfmpegResolved(string path);

    [LoggerMessage(Level = LogLevel.Debug, Message = "ffmpeg candidate '{Candidate}' not found")]
    private partial void LogFfmpegCandidateNotFound(string candidate);

    [LoggerMessage(Level = LogLevel.Error, Message = "ffmpeg not found on PATH")]
    private partial void LogFfmpegNotFound();
}
