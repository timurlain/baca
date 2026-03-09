using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class CategoryEdgeCaseTests
{
    [Fact(DisplayName = "CreateCategory_EmptyName_Returns400")]
    public async Task CreateCategoryEmptyName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "   ",
            Color = "#FF0000"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateCategory_InvalidColor_Returns400")]
    public async Task CreateCategoryInvalidColor()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "Valid Name",
            Color = "red"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateCategory_InvalidColorTooShort_Returns400")]
    public async Task CreateCategoryInvalidColorTooShort()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "Color test",
            Color = "#FFF"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateCategory_DuplicateName_CaseInsensitive")]
    public async Task CreateCategoryDuplicateNameCaseInsensitive()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, "Logistika", "#111111");
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "LOGISTIKA",
            Color = "#222222"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "UpdateCategory_EmptyName_Returns400")]
    public async Task UpdateCategoryEmptyName()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, "Hra", "#111111");
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/categories/1", new UpdateCategoryRequest
        {
            Name = ""
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateCategory_InvalidColor_Returns400")]
    public async Task UpdateCategoryInvalidColor()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, "Hra", "#111111");
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/categories/1", new UpdateCategoryRequest
        {
            Color = "notacolor"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateCategory_NotFound_Returns404")]
    public async Task UpdateCategoryNotFound()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/categories/9999", new UpdateCategoryRequest
        {
            Name = "Ghost"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "DeleteCategory_NotFound_Returns404")]
    public async Task DeleteCategoryNotFound()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/categories/9999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "CreateCategory_NonAdmin_Returns403")]
    public async Task CreateCategoryNonAdmin()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateUserClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "Forbidden",
            Color = "#FF0000"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact(DisplayName = "UpdateCategory_DuplicateName_OtherCategory_Returns409")]
    public async Task UpdateCategoryDuplicateNameOtherCategory()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedCategoryAsync(factory.Services, "Hra", "#111111");
        await SeedCategoryAsync(factory.Services, "Logistika", "#222222");
        using var client = CreateAdminClient(factory);

        // Try to rename "Logistika" to "Hra"
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var logistika = await db.Categories.SingleAsync(c => c.Name == "Logistika");

        var response = await client.PutAsJsonAsync($"/api/categories/{logistika.Id}", new UpdateCategoryRequest
        {
            Name = "Hra"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "GetCategories_OrderedBySortOrder")]
    public async Task GetCategoriesOrderedBySortOrder()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        // Create categories - they should get auto-incrementing sort orders
        await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "First",
            Color = "#111111"
        });
        await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "Second",
            Color = "#222222"
        });

        var response = await client.GetAsync("/api/categories");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var categories = await response.Content.ReadFromJsonAsync<List<CategoryDto>>();
        categories.Should().NotBeNull();
        categories!.Should().HaveCount(2);
        categories[0].Name.Should().Be("First");
        categories[1].Name.Should().Be("Second");
    }

    [Fact(DisplayName = "CreateCategory_NameTrimmed")]
    public async Task CreateCategoryNameTrimmed()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "  Trimmed  ",
            Color = "#AABBCC"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var category = await response.Content.ReadFromJsonAsync<CategoryDto>();
        category!.Name.Should().Be("Trimmed");
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

    private static async Task SeedCategoryAsync(IServiceProvider services, string name, string color)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var maxSort = await dbContext.Categories
            .Select(c => (int?)c.SortOrder)
            .MaxAsync() ?? 0;
        dbContext.Categories.Add(new Category
        {
            Name = name,
            Color = color,
            SortOrder = maxSort + 1
        });
        await dbContext.SaveChangesAsync();
    }
}
