using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class CategoryCrudTests
{
    [Fact(DisplayName = "CreateCategory")]
    public async Task CreateCategory()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "Doprava",
            Color = "#123456"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var category = await dbContext.Categories.SingleAsync();
        category.Name.Should().Be("Doprava");
        category.Color.Should().Be("#123456");
    }

    [Fact(DisplayName = "UpdateCategory")]
    public async Task UpdateCategory()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, 1, "Hra", "#111111");
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/categories/1", new UpdateCategoryRequest
        {
            Name = "Produkce",
            Color = "#222222",
            SortOrder = 4
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var category = await dbContext.Categories.SingleAsync();
        category.Name.Should().Be("Produkce");
        category.Color.Should().Be("#222222");
        category.SortOrder.Should().Be(4);
    }

    [Fact(DisplayName = "DeleteCategory_Empty")]
    public async Task DeleteCategoryEmpty()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, 1, "Hra", "#111111");
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/categories/1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        (await dbContext.Categories.AnyAsync()).Should().BeFalse();
    }

    [Fact(DisplayName = "DeleteCategory_HasTasks")]
    public async Task DeleteCategoryHasTasks()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryWithTaskAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/categories/1");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "DuplicateName")]
    public async Task DuplicateName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, 1, "Hra", "#111111");
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "hra",
            Color = "#333333"
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

    private static async Task SeedCategoryAsync(IServiceProvider services, int id, string name, string color)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        dbContext.Categories.Add(new Category
        {
            Id = id,
            Name = name,
            Color = color,
            SortOrder = 1
        });
        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedCategoryWithTaskAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();

        dbContext.Users.Add(new User
        {
            Id = 1,
            Name = "Admin",
            Email = "admin@baca.local",
            Role = UserRole.Admin,
            AvatarColor = "#10B981"
        });
        dbContext.Categories.Add(new Category
        {
            Id = 1,
            Name = "Logistika",
            Color = "#F59E0B",
            SortOrder = 1
        });
        dbContext.TaskItems.Add(new TaskItem
        {
            Title = "Postavit stan",
            Status = TaskItemStatus.Open,
            Priority = Priority.Medium,
            CategoryId = 1,
            CreatedById = 1,
            UpdatedAt = new DateTime(2026, 3, 8, 10, 0, 0, DateTimeKind.Utc)
        });

        await dbContext.SaveChangesAsync();
    }
}
