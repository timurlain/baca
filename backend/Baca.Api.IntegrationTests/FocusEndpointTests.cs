using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public class FocusEndpointTests : IntegrationTestBase
{
    public FocusEndpointTests(BacaWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task ReturnsMax3()
    {
        var client = await CreateAuthenticatedClientAsync(UserRole.User);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await EnsureUserAsync(db, UserRole.User);

        for (var i = 0; i < 5; i++)
        {
            db.TaskItems.Add(new TaskItem
            {
                Title = $"Focus {i}",
                Status = TaskItemStatus.Open,
                Priority = Priority.High,
                AssigneeId = user.Id,
                CreatedById = user.Id
            });
        }
        await db.SaveChangesAsync();

        var response = await client.GetAsync("/api/focus");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var tasks = await response.Content.ReadFromJsonAsync<List<FocusTaskDto>>();
        tasks.Should().NotBeNull();
        tasks!.Count.Should().BeLessThanOrEqualTo(3);
    }

    [Fact]
    public async Task OnlyOpenAndInProgress()
    {
        var client = await CreateAuthenticatedClientAsync(UserRole.User);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await EnsureUserAsync(db, UserRole.User);

        db.TaskItems.AddRange(
            new TaskItem { Title = "Open", Status = TaskItemStatus.Open, AssigneeId = user.Id, CreatedById = user.Id },
            new TaskItem { Title = "InProgress", Status = TaskItemStatus.InProgress, AssigneeId = user.Id, CreatedById = user.Id },
            new TaskItem { Title = "Done", Status = TaskItemStatus.Done, AssigneeId = user.Id, CreatedById = user.Id },
            new TaskItem { Title = "Idea", Status = TaskItemStatus.Idea, AssigneeId = user.Id, CreatedById = user.Id });
        await db.SaveChangesAsync();

        var response = await client.GetAsync("/api/focus");
        var tasks = await response.Content.ReadFromJsonAsync<List<FocusTaskDto>>();

        tasks.Should().NotBeNull();
        tasks!.Should().OnlyContain(t =>
            t.Status == TaskItemStatus.Open || t.Status == TaskItemStatus.InProgress);
    }

    [Fact]
    public async Task OnlyMyTasks()
    {
        var client = await CreateAuthenticatedClientAsync(UserRole.User);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await EnsureUserAsync(db, UserRole.User);
        var other = await EnsureOtherUserAsync(db);

        db.TaskItems.AddRange(
            new TaskItem { Title = "Mine", Status = TaskItemStatus.Open, AssigneeId = user.Id, CreatedById = user.Id },
            new TaskItem { Title = "Others", Status = TaskItemStatus.Open, AssigneeId = other.Id, CreatedById = other.Id });
        await db.SaveChangesAsync();

        var response = await client.GetAsync("/api/focus");
        var tasks = await response.Content.ReadFromJsonAsync<List<FocusTaskDto>>();

        tasks.Should().NotBeNull();
        tasks!.Should().NotContain(t => t.Title == "Others");
    }

    [Fact]
    public async Task SortedByPriorityThenDueDate()
    {
        // Use a dedicated user to avoid data pollution from other tests
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = new User
        {
            Name = "FocusSortUser",
            Email = "focus-sort@baca.local",
            Role = UserRole.User,
            AvatarColor = "#10B981",
            IsActive = true,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.User.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", user.Id.ToString(System.Globalization.CultureInfo.InvariantCulture));

        db.TaskItems.AddRange(
            new TaskItem { Title = "Low", Status = TaskItemStatus.Open, Priority = Priority.Low, AssigneeId = user.Id, CreatedById = user.Id, DueDate = DateTime.UtcNow.AddDays(1) },
            new TaskItem { Title = "High Later", Status = TaskItemStatus.Open, Priority = Priority.High, AssigneeId = user.Id, CreatedById = user.Id, DueDate = DateTime.UtcNow.AddDays(5) },
            new TaskItem { Title = "High Soon", Status = TaskItemStatus.Open, Priority = Priority.High, AssigneeId = user.Id, CreatedById = user.Id, DueDate = DateTime.UtcNow.AddDays(1) });
        await db.SaveChangesAsync();

        var response = await client.GetAsync("/api/focus");
        var tasks = await response.Content.ReadFromJsonAsync<List<FocusTaskDto>>();

        tasks.Should().NotBeNull();
        tasks![0].Title.Should().Be("High Soon");
        tasks[1].Title.Should().Be("High Later");
        tasks[2].Title.Should().Be("Low");
    }

    [Fact]
    public async Task EmptyWhenNoTasks()
    {
        var client = await CreateAuthenticatedClientAsync(UserRole.User);

        var response = await client.GetAsync("/api/focus");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var tasks = await response.Content.ReadFromJsonAsync<List<FocusTaskDto>>();
        tasks.Should().NotBeNull();
    }

    private static async Task<User> EnsureOtherUserAsync(BacaDbContext db)
    {
        var email = "other@baca.local";
        var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
            db.Users, u => u.Email == email);
        if (user is not null)
            return user;

        user = new User
        {
            Name = "Other",
            Email = email,
            Role = UserRole.User,
            AvatarColor = "#EF4444"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }
}
