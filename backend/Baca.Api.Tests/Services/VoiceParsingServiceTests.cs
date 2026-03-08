using System.Net;
using System.Text;
using System.Text.Json;
using Baca.Api.Data;
using Baca.Api.Models;
using Baca.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Baca.Api.Tests.Services;

public sealed class VoiceParsingServiceTests
{
    [Fact(DisplayName = "ParseTranscription_ExtractsTitle")]
    public async Task ParseTranscriptionExtractsTitle()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, CreateAnthropicResponse("""{"title":"Koupit lano","status":"Open"}"""));

        var response = await service.ParseTranscriptionAsync("Kup prosím lano");

        response.Title.Should().Be("Koupit lano");
    }

    [Fact(DisplayName = "ParseTranscription_MatchesAssignee")]
    public async Task ParseTranscriptionMatchesAssignee()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Users.Add(new User
        {
            Id = 1,
            Name = "Honza",
            Email = "honza@baca.local",
            Role = UserRole.User,
            AvatarColor = "#3B82F6"
        });
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            CreateAnthropicResponse("""{"title":"Připravit lano","assigneeName":"Honzík","assigneeConfidence":0.4,"status":"Open"}"""));

        var response = await service.ParseTranscriptionAsync("Honzík připraví lano");

        response.AssigneeId.Should().Be(1);
        response.AssigneeConfidence.Should().BeGreaterThan(0.4);
    }

    [Fact(DisplayName = "ParseTranscription_MatchesCategory")]
    public async Task ParseTranscriptionMatchesCategory()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(new Category
        {
            Id = 2,
            Name = "Logistika",
            Color = "#F59E0B",
            SortOrder = 1
        });
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            CreateAnthropicResponse("""{"title":"Přivézt materiál","categoryName":"logistika","categoryConfidence":0.6,"status":"Open"}"""));

        var response = await service.ParseTranscriptionAsync("Materiál patří do logistiky");

        response.CategoryId.Should().Be(2);
        response.CategoryConfidence.Should().BeGreaterThanOrEqualTo(0.6);
    }

    [Fact(DisplayName = "ParseTranscription_ParsesPriority")]
    public async Task ParseTranscriptionParsesPriority()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            CreateAnthropicResponse("""{"title":"Urgentní úkol","priority":"High","priorityConfidence":0.9,"status":"Open"}"""));

        var response = await service.ParseTranscriptionAsync("Je to urgentní");

        response.Priority.Should().Be(Priority.High);
    }

    [Fact(DisplayName = "ParseTranscription_ParsesDueDate")]
    public async Task ParseTranscriptionParsesDueDate()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            CreateAnthropicResponse("""{"title":"Do pátku","dueDate":"2026-03-13","dueDateConfidence":0.8,"status":"Open"}"""));

        var response = await service.ParseTranscriptionAsync("Dodělat to do pátku");

        response.DueDate.Should().Be("2026-03-13");
    }

    [Fact(DisplayName = "ParseTranscription_HandlesUnknownAssignee")]
    public async Task ParseTranscriptionHandlesUnknownAssignee()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            CreateAnthropicResponse("""{"title":"Úkol","assigneeName":"Neznámý","assigneeConfidence":0.8,"status":"Open"}"""));

        var response = await service.ParseTranscriptionAsync("Neznámý vyřeší úkol");

        response.AssigneeId.Should().BeNull();
        response.AssigneeConfidence.Should().BeLessThanOrEqualTo(0.3);
    }

    [Fact(DisplayName = "ParseTranscription_HandlesMalformedJson")]
    public async Task ParseTranscriptionHandlesMalformedJson()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, CreateAnthropicResponse("{\"title\":\"bad json\""));

        var response = await service.ParseTranscriptionAsync("Rozbitá odpověď");

        response.RawTranscription.Should().Be("Rozbitá odpověď");
        response.Status.Should().Be(TaskItemStatus.Open);
        response.Title.Should().BeNull();
    }

    [Fact(DisplayName = "ParseTranscription_ApiError")]
    public async Task ParseTranscriptionApiError()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("""{"error":"upstream"}""", Encoding.UTF8, "application/json")
            });

        var act = async () => await service.ParseTranscriptionAsync("Něco se pokazilo");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*500*");
    }

    private static VoiceParsingService CreateService(BacaDbContext dbContext, HttpResponseMessage responseMessage)
    {
        var handler = new StubHttpMessageHandler(responseMessage);
        var httpClient = new HttpClient(handler);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Anthropic:ApiKey"] = "test-key",
                    ["Anthropic:Model"] = "claude-haiku-test"
                })
            .Build();

        return new VoiceParsingService(
            dbContext,
            httpClient,
            configuration,
            new FakeTimeProvider(new DateTimeOffset(2026, 3, 8, 12, 0, 0, TimeSpan.Zero)));
    }

    private static HttpResponseMessage CreateAnthropicResponse(string text)
    {
        var payload = JsonSerializer.Serialize(
            new
            {
                content = new[]
                {
                    new
                    {
                        type = "text",
                        text
                    }
                }
            });

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
    }

    private static BacaDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<BacaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new BacaDbContext(options);
    }

    private sealed class StubHttpMessageHandler(HttpResponseMessage responseMessage) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(responseMessage);
        }
    }

    private sealed class FakeTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
