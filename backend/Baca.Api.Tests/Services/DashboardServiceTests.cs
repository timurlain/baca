using Baca.Api.Data;
using Baca.Api.Models;
using Baca.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Tests.Services;

public sealed class DashboardServiceTests
{
    [Fact(DisplayName = "GetStats_CorrectCounts")]
    public async Task GetStatsCorrectCounts()
    {
        await using var dbContext = CreateDbContext();
        SeedUsersAndCategories(dbContext);
        dbContext.TaskItems.AddRange(
            CreateTask("Idea", TaskItemStatus.Idea),
            CreateTask("Open", TaskItemStatus.Open),
            CreateTask("Review", TaskItemStatus.ForReview),
            CreateTask("Done", TaskItemStatus.Done));
        await dbContext.SaveChangesAsync();

        var service = new DashboardService(dbContext, CreateTimeProvider());

        var result = await service.GetDashboardAsync(1);

        result.TotalTasks.Should().Be(4);
        result.TasksByStatus.Should().Contain(
            new KeyValuePair<string, int>(TaskItemStatus.Idea.ToString(), 1));
        result.TasksByStatus.Should().Contain(
            new KeyValuePair<string, int>(TaskItemStatus.Open.ToString(), 1));
        result.TasksByStatus.Should().Contain(
            new KeyValuePair<string, int>(TaskItemStatus.ForReview.ToString(), 1));
        result.TasksByStatus.Should().Contain(
            new KeyValuePair<string, int>(TaskItemStatus.Done.ToString(), 1));
        result.ProgressPercent.Should().Be(25);
    }

    [Fact(DisplayName = "GetStats_OverdueCount")]
    public async Task GetStatsOverdueCount()
    {
        await using var dbContext = CreateDbContext();
        SeedUsersAndCategories(dbContext);
        dbContext.TaskItems.AddRange(
            CreateTask("Overdue", TaskItemStatus.Open, dueDate: new DateTime(2026, 3, 7)),
            CreateTask("Due today", TaskItemStatus.Open, dueDate: new DateTime(2026, 3, 8)),
            CreateTask("Done overdue", TaskItemStatus.Done, dueDate: new DateTime(2026, 3, 1)));
        await dbContext.SaveChangesAsync();

        var service = new DashboardService(dbContext, CreateTimeProvider());

        var result = await service.GetDashboardAsync(1);

        result.OverdueTasks.Should().Be(1);
    }

    [Fact(DisplayName = "GetStats_CategoryProgress")]
    public async Task GetStatsCategoryProgress()
    {
        await using var dbContext = CreateDbContext();
        SeedUsersAndCategories(dbContext);
        dbContext.TaskItems.AddRange(
            CreateTask("Food done", TaskItemStatus.Done, categoryId: 1),
            CreateTask("Food open", TaskItemStatus.Open, categoryId: 1),
            CreateTask("Logistics done", TaskItemStatus.Done, categoryId: 2));
        await dbContext.SaveChangesAsync();

        var service = new DashboardService(dbContext, CreateTimeProvider());

        var result = await service.GetDashboardAsync(1);

        result.CategoryProgress.Should().HaveCount(2);
        result.CategoryProgress.Should().ContainSingle(progress =>
            progress.CategoryId == 1
            && progress.TotalTasks == 2
            && progress.DoneTasks == 1
            && progress.ProgressPercent == 50);
        result.CategoryProgress.Should().ContainSingle(progress =>
            progress.CategoryId == 2
            && progress.TotalTasks == 1
            && progress.DoneTasks == 1
            && progress.ProgressPercent == 100);
    }

    [Fact(DisplayName = "GetStats_EmptyDatabase")]
    public async Task GetStatsEmptyDatabase()
    {
        await using var dbContext = CreateDbContext();
        var service = new DashboardService(dbContext, CreateTimeProvider());

        var result = await service.GetDashboardAsync(null);

        result.TotalTasks.Should().Be(0);
        result.OverdueTasks.Should().Be(0);
        result.ProgressPercent.Should().Be(0);
        result.CategoryProgress.Should().BeEmpty();
        result.RecentTasks.Should().BeEmpty();
        result.MyTaskCount.Should().Be(0);
        result.TasksByStatus.Values.Should().OnlyContain(count => count == 0);
    }

    private static BacaDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<BacaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new BacaDbContext(options);
    }

    private static FakeTimeProvider CreateTimeProvider()
    {
        return new FakeTimeProvider(new DateTimeOffset(2026, 3, 8, 12, 0, 0, TimeSpan.Zero));
    }

    private static void SeedUsersAndCategories(BacaDbContext dbContext)
    {
        dbContext.Users.Add(new User
        {
            Id = 1,
            Name = "Admin",
            Email = "admin@baca.local",
            Role = UserRole.Admin,
            AvatarColor = "#10B981"
        });

        dbContext.Categories.AddRange(
            new Category
            {
                Id = 1,
                Name = "Jídlo",
                Color = "#EF4444",
                SortOrder = 1
            },
            new Category
            {
                Id = 2,
                Name = "Logistika",
                Color = "#F59E0B",
                SortOrder = 2
            });

        dbContext.SaveChanges();
    }

    private static TaskItem CreateTask(
        string title,
        TaskItemStatus status,
        int? categoryId = null,
        DateTime? dueDate = null)
    {
        return new TaskItem
        {
            Title = title,
            Status = status,
            Priority = Priority.Medium,
            CategoryId = categoryId,
            AssigneeId = 1,
            CreatedById = 1,
            DueDate = dueDate,
            UpdatedAt = new DateTime(2026, 3, 8, 10, 0, 0, DateTimeKind.Utc)
        };
    }

    private sealed class FakeTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
