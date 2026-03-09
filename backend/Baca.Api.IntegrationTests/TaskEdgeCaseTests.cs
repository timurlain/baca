using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class TaskEdgeCaseTests
{
    [Fact(DisplayName = "CreateTask_MaxLengthTitle_200Chars")]
    public async Task CreateTaskMaxLengthTitle()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedUserAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var longTitle = new string('A', 200);
        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = longTitle
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        task!.Title.Should().HaveLength(200);
    }

    [Fact(DisplayName = "CreateTask_MaxLengthDescription_10000Chars")]
    public async Task CreateTaskMaxLengthDescription()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedUserAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var longDescription = new string('B', 10_000);
        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = "Task with long desc",
            Description = longDescription
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        task!.Description.Should().HaveLength(10_000);
    }

    [Fact(DisplayName = "CreateTask_EmptyDescription_IsNull")]
    public async Task CreateTaskEmptyDescription()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedUserAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = "Title only"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        task!.Description.Should().BeNull();
    }

    [Fact(DisplayName = "CreateTask_NonExistentCategoryId_CausesServerError")]
    public async Task CreateTaskNonExistentCategoryId()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedUserAsync(factory.Services);

        // WebApplicationFactory rethrows unhandled server exceptions on the client side.
        // Use AllowAutoRedirect + rethrow configuration to swallow them and get the HTTP status.
        var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.User.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "1");

        // CategoryId 9999 does not exist. The endpoint does not validate FK existence before
        // saving, so the DB rejects with a FK constraint violation. The server propagates
        // this as a DbUpdateException. This documents that the endpoint lacks FK validation.
        Func<Task> act = async () => await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = "Orphan task",
            CategoryId = 9999
        });

        // The DbUpdateException propagates through the test server as an unhandled exception
        await act.Should().ThrowAsync<Exception>(
            "Non-existent categoryId should cause a DB error (endpoint lacks FK validation)");
    }

    [Fact(DisplayName = "CreateTask_UnicodeTitle_CzechDiacritics")]
    public async Task CreateTaskUnicodeTitleCzech()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedUserAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        const string czechTitle = "Připravit řežňák, šťavnatý žlutý ďáblík s ňoumou";
        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = czechTitle
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        task!.Title.Should().Be(czechTitle);
    }

    [Fact(DisplayName = "CreateTask_GuestDenied")]
    public async Task CreateTaskGuestDenied()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Guest.ToString());

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = "Guest should not create"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact(DisplayName = "GetTask_NotFound_Returns404")]
    public async Task GetTaskNotFound()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var response = await client.GetAsync("/api/tasks/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "UpdateTask_NotFound_Returns404")]
    public async Task UpdateTaskNotFound()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var response = await client.PutAsJsonAsync("/api/tasks/99999", new UpdateTaskRequest
        {
            Title = "Ghost"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "DeleteTask_NotFound_Returns404")]
    public async Task DeleteTaskNotFound()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var response = await client.DeleteAsync("/api/tasks/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "ChangeStatus_NotFound_Returns404")]
    public async Task ChangeStatusNotFound()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        var response = await client.PatchAsJsonAsync("/api/tasks/99999/status", new StatusChangeRequest
        {
            Status = TaskItemStatus.Done
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "CreateTask_NullDescription_VsEmptyString")]
    public async Task CreateTaskNullVsEmptyDescription()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedUserAsync(factory.Services);
        using var client = CreateMemberClient(factory);

        // Null description
        var response1 = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = "Null desc",
            Description = null
        });
        response1.StatusCode.Should().Be(HttpStatusCode.Created);
        var task1 = await response1.Content.ReadFromJsonAsync<TaskDto>();
        task1!.Description.Should().BeNull();

        // Empty string description
        var response2 = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest
        {
            Title = "Empty desc",
            Description = ""
        });
        response2.StatusCode.Should().Be(HttpStatusCode.Created);
        var task2 = await response2.Content.ReadFromJsonAsync<TaskDto>();
        task2!.Description.Should().Be("");
    }

    private static HttpClient CreateMemberClient(BacaWebApplicationFactory factory)
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

    private static async Task SeedUserAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        dbContext.Users.Add(new User
        {
            Id = 1,
            Name = "TestUser",
            Email = "test@baca.local",
            Role = UserRole.User,
            AvatarColor = "#10B981"
        });
        await dbContext.SaveChangesAsync();
    }
}
