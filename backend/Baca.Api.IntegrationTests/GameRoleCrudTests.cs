using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class GameRoleCrudTests
{
    [Fact(DisplayName = "CreateGameRole")]
    public async Task CreateGameRole()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/gameroles", new CreateGameRoleRequest
        {
            Name = "Rytíř",
            Description = "Knight",
            Color = "#3B82F6"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var role = await dbContext.GameRoles.SingleAsync();
        role.Name.Should().Be("Rytíř");
        role.Description.Should().Be("Knight");
        role.Color.Should().Be("#3B82F6");
    }

    [Fact(DisplayName = "UpdateGameRole")]
    public async Task UpdateGameRole()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedGameRoleAsync(factory.Services, 1, "Rytíř", "Knight", "#3B82F6");
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/gameroles/1", new UpdateGameRoleRequest
        {
            Name = "Mág",
            Description = "Mage",
            Color = "#8B5CF6",
            SortOrder = 2
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var role = await dbContext.GameRoles.SingleAsync();
        role.Name.Should().Be("Mág");
        role.Description.Should().Be("Mage");
        role.Color.Should().Be("#8B5CF6");
        role.SortOrder.Should().Be(2);
    }

    [Fact(DisplayName = "DeleteGameRole_Empty")]
    public async Task DeleteGameRoleEmpty()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedGameRoleAsync(factory.Services, 1, "Rytíř", "Knight", "#3B82F6");
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/gameroles/1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        (await dbContext.GameRoles.AnyAsync()).Should().BeFalse();
    }

    [Fact(DisplayName = "DeleteGameRole_HasUsers")]
    public async Task DeleteGameRoleHasUsers()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedGameRoleWithUserAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/gameroles/1");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "DuplicateName")]
    public async Task DuplicateName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedGameRoleAsync(factory.Services, 1, "Rytíř", "Knight", "#3B82F6");
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/gameroles", new CreateGameRoleRequest
        {
            Name = "rytíř",
            Color = "#EF4444"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    private static HttpClient CreateAdminClient(BacaWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Admin.ToString());
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

    private static async Task SeedGameRoleAsync(IServiceProvider services, int id, string name, string? description, string color)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        dbContext.GameRoles.Add(new GameRole
        {
            Id = id,
            Name = name,
            Description = description,
            Color = color,
            SortOrder = 1
        });
        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedGameRoleWithUserAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();

        dbContext.GameRoles.Add(new GameRole
        {
            Id = 1,
            Name = "Rytíř",
            Description = "Knight",
            Color = "#3B82F6",
            SortOrder = 1
        });
        dbContext.Users.Add(new User
        {
            Id = 1,
            Name = "Admin",
            Email = "admin@baca.local",
            Role = UserRole.Admin,
            AvatarColor = "#10B981",
            GameRoleId = 1
        });

        await dbContext.SaveChangesAsync();
    }
}
