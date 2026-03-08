using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class DashboardEndpointTests
{
    [Fact(DisplayName = "GetDashboard")]
    public async Task GetDashboard()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();
        await SeedDashboardDataAsync(factory.Services);

        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<DashboardDto>();
        payload.Should().NotBeNull();
        payload!.TotalTasks.Should().Be(3);
        payload.OverdueTasks.Should().Be(1);
        payload.TasksByStatus[TaskItemStatus.Done.ToString()].Should().Be(1);
        payload.CategoryProgress.Should().ContainSingle(progress =>
            progress.CategoryName == "Logistika"
            && progress.DoneTasks == 1
            && progress.TotalTasks == 2);
    }

    [Fact(DisplayName = "GetDashboard_GuestAllowed")]
    public async Task GetDashboardGuestAllowed()
    {
        await using var factory = new BacaWebApplicationFactory();
        await factory.InitializeAsync();

        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static async Task SeedDashboardDataAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();

        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.MigrateAsync();

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

        dbContext.TaskItems.AddRange(
            new TaskItem
            {
                Title = "Hotovo",
                Status = TaskItemStatus.Done,
                Priority = Priority.Medium,
                CategoryId = 1,
                CreatedById = 1,
                UpdatedAt = new DateTime(2026, 3, 8, 8, 0, 0, DateTimeKind.Utc)
            },
            new TaskItem
            {
                Title = "Po splatnosti",
                Status = TaskItemStatus.Open,
                Priority = Priority.High,
                CategoryId = 1,
                CreatedById = 1,
                DueDate = new DateTime(2026, 3, 7, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 3, 8, 9, 0, 0, DateTimeKind.Utc)
            },
            new TaskItem
            {
                Title = "Bez kategorie",
                Status = TaskItemStatus.Open,
                Priority = Priority.Low,
                CreatedById = 1,
                UpdatedAt = new DateTime(2026, 3, 8, 10, 0, 0, DateTimeKind.Utc)
            });

        await dbContext.SaveChangesAsync();
    }
}
