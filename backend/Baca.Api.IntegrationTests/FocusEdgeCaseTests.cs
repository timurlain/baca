using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class FocusEdgeCaseTests
{
    [Fact(DisplayName = "Focus_100OpenTasks_ReturnsOnly3")]
    public async Task Focus100TasksReturnsOnly3()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        var userId = await SeedUserAsync(factory.Services);
        using var client = CreateMemberClient(factory, userId);

        // Create 100+ open tasks assigned to this user
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
            for (var i = 0; i < 105; i++)
            {
                db.TaskItems.Add(new TaskItem
                {
                    Title = $"Task {i}",
                    Status = TaskItemStatus.Open,
                    Priority = Priority.Medium,
                    AssigneeId = userId,
                    CreatedById = userId,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            await db.SaveChangesAsync();
        }

        var response = await client.GetAsync("/api/focus");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tasks = await response.Content.ReadFromJsonAsync<List<FocusTaskDto>>();
        tasks.Should().NotBeNull();
        tasks!.Should().HaveCount(3, "Focus endpoint should always return at most 3 tasks");
    }

    [Fact(DisplayName = "Focus_GuestDenied")]
    public async Task FocusGuestDenied()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Guest.ToString());

        var response = await client.GetAsync("/api/focus");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private static HttpClient CreateMemberClient(BacaWebApplicationFactory factory, int userId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.User.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", userId.ToString(System.Globalization.CultureInfo.InvariantCulture));
        return client;
    }

    private static async Task ResetDatabaseAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.MigrateAsync();
    }

    private static async Task<int> SeedUserAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = new User
        {
            Name = "FocusUser",
            Email = "focus@baca.local",
            Role = UserRole.User,
            AvatarColor = "#10B981"
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        return user.Id;
    }
}
