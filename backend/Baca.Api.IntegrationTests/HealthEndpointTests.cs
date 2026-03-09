using System.Net;
using System.Net.Http.Json;
using Baca.Api.DTOs;
using FluentAssertions;

namespace Baca.Api.IntegrationTests;

public sealed class HealthEndpointTests
{
    [Fact(DisplayName = "Health_ReturnsHealthy_WhenDbConnected")]
    public async Task HealthReturnsHealthy()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
        health.Should().NotBeNull();
        health!.Status.Should().Be("healthy");
        health.Db.Should().Be("ok");
    }

    [Fact(DisplayName = "Health_NoAuthRequired")]
    public async Task HealthNoAuthRequired()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();

        // No auth headers at all
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "Health endpoint should be publicly accessible without authentication");
    }

    [Fact(DisplayName = "Health_ResponseStructure")]
    public async Task HealthResponseStructure()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("status");
        content.Should().Contain("db");
    }
}
