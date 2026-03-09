using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Baca.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Baca.Api.IntegrationTests;

public sealed class VoiceEndpointTests
{
    [Fact(DisplayName = "Transcribe_ValidAudio")]
    public async Task TranscribeValidAudio()
    {
        await using var factory = CreateFactory(
            new FakeVoiceTranscriptionService(),
            new FakeVoiceParsingService());
        await factory.InitializeAsync();
        using var client = CreateMemberClient(factory);

        using var content = new MultipartFormDataContent();
        using var audioContent = new ByteArrayContent([0x52, 0x49, 0x46, 0x46]);
        audioContent.Headers.ContentType = MediaTypeHeaderValue.Parse("audio/wav");
        content.Add(audioContent, "audio", "sample.wav");

        var response = await client.PostAsync("/api/voice/transcribe", content);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<TranscriptionResult>();
        payload.Should().NotBeNull();
        payload!.Transcription.Should().Be("Přepsaný text");
    }

    [Fact(DisplayName = "Parse_ValidTranscription")]
    public async Task ParseValidTranscription()
    {
        await using var factory = CreateFactory(
            new FakeVoiceTranscriptionService(),
            new FakeVoiceParsingService());
        await factory.InitializeAsync();
        using var client = CreateMemberClient(factory);

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceParseRequest
        {
            Transcription = "Honza potřebuje lano"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<VoiceParseResponse>();
        payload.Should().NotBeNull();
        payload!.Title.Should().Be("Koupit lano");
        payload.AssigneeId.Should().Be(3);
        payload.CategoryId.Should().Be(2);
        payload.Priority.Should().Be(Priority.High);
    }

    [Fact(DisplayName = "Voice_GuestDenied")]
    public async Task VoiceGuestDenied()
    {
        await using var factory = CreateFactory(
            new FakeVoiceTranscriptionService(),
            new FakeVoiceParsingService());
        await factory.InitializeAsync();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Guest.ToString());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceParseRequest
        {
            Transcription = "Host nemá přístup"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private static BacaWebApplicationFactory CreateFactory(
        IVoiceTranscriptionService transcriptionService,
        IVoiceParsingService parsingService)
    {
        return new BacaWebApplicationFactory(services =>
        {
            services.RemoveAll<IVoiceTranscriptionService>();
            services.RemoveAll<IVoiceParsingService>();
            services.AddSingleton(transcriptionService);
            services.AddSingleton(parsingService);
        });
    }

    private static HttpClient CreateMemberClient(BacaWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.User.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "1");
        return client;
    }

    private sealed class FakeVoiceTranscriptionService : IVoiceTranscriptionService
    {
        public Task<TranscriptionResult> TranscribeAsync(Stream audioStream, string contentType, CancellationToken ct = default)
        {
            return Task.FromResult(new TranscriptionResult
            {
                Transcription = "Přepsaný text"
            });
        }
    }

    private sealed class FakeVoiceParsingService : IVoiceParsingService
    {
        public Task<VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct = default)
        {
            return Task.FromResult(new VoiceParseResponse
            {
                Title = "Koupit lano",
                AssigneeName = "Honza",
                AssigneeId = 3,
                AssigneeConfidence = 0.95,
                CategoryName = "Logistika",
                CategoryId = 2,
                CategoryConfidence = 0.9,
                Priority = Priority.High,
                PriorityConfidence = 0.85,
                DueDate = "2026-04-24",
                DueDateConfidence = 0.7,
                Status = TaskItemStatus.Open,
                RawTranscription = transcription
            });
        }

        public Task<BulkParseResponse> ParseBulkTextAsync(string text, CancellationToken ct = default)
        {
            return Task.FromResult(new BulkParseResponse
            {
                Tasks =
                [
                    new VoiceParseResponse
                    {
                        Title = "Koupit lano",
                        Status = TaskItemStatus.Open,
                        RawTranscription = text
                    }
                ]
            });
        }
    }
}
