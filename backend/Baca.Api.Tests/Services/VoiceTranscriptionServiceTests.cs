using Baca.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Baca.Api.Tests.Services;

public sealed class VoiceTranscriptionServiceTests
{
    [Fact(DisplayName = "TranscribeAsync_ThrowsWhenNoSpeechKey")]
    public async Task TranscribeAsyncThrowsWhenNoSpeechKey()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var service = new VoiceTranscriptionService(config, NullLogger<VoiceTranscriptionService>.Instance);

        using var stream = new MemoryStream([0x52, 0x49, 0x46, 0x46]);
        var act = async () => await service.TranscribeAsync(stream, "audio/wav");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Azure Speech key*");
    }

    [Fact(DisplayName = "TranscribeAsync_ThrowsWhenNoSpeechRegion")]
    public async Task TranscribeAsyncThrowsWhenNoSpeechRegion()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Azure:Speech:Key"] = "test-key"
            })
            .Build();

        var service = new VoiceTranscriptionService(config, NullLogger<VoiceTranscriptionService>.Instance);

        using var stream = new MemoryStream([0x52, 0x49, 0x46, 0x46]);
        var act = async () => await service.TranscribeAsync(stream, "audio/wav");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Azure Speech region*");
    }

    [Fact(DisplayName = "TranscribeAsync_AcceptsAlternateConfigKeys")]
    public async Task TranscribeAsyncAcceptsAlternateConfigKeys()
    {
        // Test that the service accepts the double-underscore config key format
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Azure__Speech__Key"] = "test-key-alt",
                ["Azure__Speech__Region"] = "westeurope"
            })
            .Build();

        var service = new VoiceTranscriptionService(config, NullLogger<VoiceTranscriptionService>.Instance);

        // This will fail at the Azure SDK level (invalid key), but should not throw
        // on config resolution. We verify it gets past the config check.
        using var stream = new MemoryStream([0x52, 0x49, 0x46, 0x46]);
        var act = async () => await service.TranscribeAsync(stream, "audio/wav");

        // It should throw something from Azure SDK or file processing,
        // but NOT InvalidOperationException about missing config
        try
        {
            await act();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Azure Speech key") || ex.Message.Contains("Azure Speech region"))
        {
            // This means config resolution failed, which is wrong
            throw new Xunit.Sdk.XunitException(
                $"Expected config keys to be resolved, but got: {ex.Message}");
        }
        catch
        {
            // Any other exception is fine - means config was resolved
        }
    }

    [Fact(DisplayName = "Constructor_DoesNotThrow")]
    public void ConstructorDoesNotThrow()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var act = () => new VoiceTranscriptionService(config, NullLogger<VoiceTranscriptionService>.Instance);

        act.Should().NotThrow("Construction should be lazy, not validating config");
    }
}
