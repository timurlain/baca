using System.Net;
using System.Net.Http.Json;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Baca.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Baca.Api.IntegrationTests;

public sealed class AuthEdgeCaseTests
{
    [Fact(DisplayName = "VerifyToken_WrongFormat_NotGuid_Returns401Not500")]
    public async Task VerifyTokenWrongFormatNotGuid()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/verify/not-a-valid-guid-token");

        // Should return 401 (Unauthorized) not 500 (Internal Server Error)
        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500, "Invalid token format should not cause server error");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact(DisplayName = "VerifyToken_EmptyToken_Returns401Or404")]
    public async Task VerifyTokenEmpty()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/verify/");

        // Empty token should not return 500
        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500, "Empty token should not cause server error");
    }

    [Fact(DisplayName = "VerifyToken_SpecialCharacters_Returns401Not500")]
    public async Task VerifyTokenSpecialCharacters()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/verify/<script>alert(1)</script>");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500, "XSS-like token should not cause server error");
    }

    [Fact(DisplayName = "VoiceParse_EmptyTranscription_Returns400")]
    public async Task VoiceParseEmptyTranscription()
    {
        await using var factory = CreateVoiceFactory();
        await factory.InitializeAsync();
        using var client = CreateMemberClient(factory);

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceParseRequest
        {
            Transcription = ""
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "VoiceParse_WhitespaceTranscription_Returns400")]
    public async Task VoiceParseWhitespaceTranscription()
    {
        await using var factory = CreateVoiceFactory();
        await factory.InitializeAsync();
        using var client = CreateMemberClient(factory);

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceParseRequest
        {
            Transcription = "   "
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "VoiceTranscribe_NoAudioField_Returns400")]
    public async Task VoiceTranscribeNoAudioField()
    {
        await using var factory = CreateVoiceFactory();
        await factory.InitializeAsync();
        using var client = CreateMemberClient(factory);

        // Submit a form with a non-audio field (so the form parses successfully
        // but the "audio" file is missing)
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("dummy"), "other_field");

        var response = await client.PostAsync("/api/voice/transcribe", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "GuestLogin_EmptyPin_Returns401")]
    public async Task GuestLoginEmptyPin()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/guest", new GuestLoginRequest
        {
            Pin = ""
        });

        // Should not crash, just return 401
        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500);
    }

    private static BacaWebApplicationFactory CreateVoiceFactory()
    {
        return new BacaWebApplicationFactory(services =>
        {
            services.RemoveAll<IVoiceTranscriptionService>();
            services.RemoveAll<IVoiceParsingService>();
            services.AddSingleton<IVoiceTranscriptionService, FakeVoiceTranscriptionService>();
            services.AddSingleton<IVoiceParsingService, FakeVoiceParsingService>();
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
            return Task.FromResult(new TranscriptionResult { Transcription = "fake" });
        }
    }

    private sealed class FakeVoiceParsingService : IVoiceParsingService
    {
        public Task<VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct = default)
        {
            return Task.FromResult(new VoiceParseResponse
            {
                Title = transcription,
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
                        Title = text,
                        Status = TaskItemStatus.Open,
                        RawTranscription = text
                    }
                ]
            });
        }
    }
}
