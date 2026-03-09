using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class SettingsEndpointTests
{
    [Fact(DisplayName = "GetSettings_ReturnsDefaults_WhenNoneExist")]
    public async Task GetSettingsReturnsDefaults()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.GetAsync("/api/settings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var settings = await response.Content.ReadFromJsonAsync<AppSettingsDto>();
        settings.Should().NotBeNull();
        settings!.AppName.Should().Be("Bača");
        settings.GuestPin.Should().BeEmpty("GuestPin should never be returned to the client");
    }

    [Fact(DisplayName = "UpdateSettings_AppName_Admin")]
    public async Task UpdateSettingsAppName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/settings", new UpdateSettingsRequest
        {
            AppName = "Nový Bača"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var settings = await response.Content.ReadFromJsonAsync<AppSettingsDto>();
        settings.Should().NotBeNull();
        settings!.AppName.Should().Be("Nový Bača");
    }

    [Fact(DisplayName = "UpdateSettings_GuestPin")]
    public async Task UpdateSettingsGuestPin()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/settings", new UpdateSettingsRequest
        {
            GuestPin = "newpin123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the PIN was hashed in database
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var dbSettings = await db.AppSettings.FirstAsync();
        dbSettings.GuestPin.Should().NotBe("newpin123", "GuestPin should be hashed");
        dbSettings.GuestPin.Should().NotBeEmpty();
        BCrypt.Net.BCrypt.Verify("newpin123", dbSettings.GuestPin).Should().BeTrue();
    }

    [Fact(DisplayName = "UpdateSettings_EmptyAppName_Returns400")]
    public async Task UpdateSettingsEmptyAppName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        // First set initial settings
        await client.GetAsync("/api/settings");

        var response = await client.PutAsJsonAsync("/api/settings", new UpdateSettingsRequest
        {
            AppName = "   "
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateSettings_NonAdmin_Returns403")]
    public async Task UpdateSettingsNonAdmin()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateUserClient(factory);

        var response = await client.PutAsJsonAsync("/api/settings", new UpdateSettingsRequest
        {
            AppName = "Hacker"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact(DisplayName = "UpdateSettings_AppNameTrimmed")]
    public async Task UpdateSettingsAppNameTrimmed()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/settings", new UpdateSettingsRequest
        {
            AppName = "  Trimmed Name  "
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var settings = await response.Content.ReadFromJsonAsync<AppSettingsDto>();
        settings!.AppName.Should().Be("Trimmed Name");
    }

    [Fact(DisplayName = "UpdateSettings_OnlyGuestPin_DoesNotChangeAppName")]
    public async Task UpdateSettingsOnlyPinDoesNotChangeAppName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        // Get defaults first
        await client.GetAsync("/api/settings");

        // Update only PIN
        var response = await client.PutAsJsonAsync("/api/settings", new UpdateSettingsRequest
        {
            GuestPin = "mypin"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var settings = await response.Content.ReadFromJsonAsync<AppSettingsDto>();
        settings!.AppName.Should().Be("Bača", "AppName should remain default when not provided");
    }

    [Fact(DisplayName = "GetSettings_ReusesExistingRow")]
    public async Task GetSettingsReusesExistingRow()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        // First call creates settings
        await client.GetAsync("/api/settings");
        // Second call should reuse the same row
        var response = await client.GetAsync("/api/settings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var count = await db.AppSettings.CountAsync();
        count.Should().Be(1);
    }

    private static HttpClient CreateAdminClient(BacaWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Admin.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "1");
        return client;
    }

    private static HttpClient CreateUserClient(BacaWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.User.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "1");
        return client;
    }

    private static async Task ResetDatabaseAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.MigrateAsync();
    }
}
