using Baca.Api.Data;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Tests.Services;

public class TaskSortingTests : IDisposable
{
    private readonly BacaDbContext _db;

    public TaskSortingTests()
    {
        var options = new DbContextOptionsBuilder<BacaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new BacaDbContext(options);
        SeedUser();
    }

    private void SeedUser()
    {
        _db.Users.Add(new User { Id = 1, Name = "Test", Role = UserRole.User });
        _db.SaveChanges();
    }

    [Fact]
    public async Task FocusSort_PriorityFirst_HighBeforeMediumBeforeLow()
    {
        _db.TaskItems.AddRange(
            CreateTask(1, "Low task", Priority.Low, TaskItemStatus.Open),
            CreateTask(1, "High task", Priority.High, TaskItemStatus.Open),
            CreateTask(1, "Medium task", Priority.Medium, TaskItemStatus.Open));
        await _db.SaveChangesAsync();

        var tasks = await GetFocusTasksAsync(1);

        tasks.Select(t => t.Priority).Should().BeInDescendingOrder();
        tasks[0].Title.Should().Be("High task");
    }

    [Fact]
    public async Task FocusSort_DueDateSecond_NearestFirstWithinSamePriority()
    {
        _db.TaskItems.AddRange(
            CreateTask(1, "Later", Priority.High, TaskItemStatus.Open, DateTime.UtcNow.AddDays(10)),
            CreateTask(1, "Sooner", Priority.High, TaskItemStatus.Open, DateTime.UtcNow.AddDays(1)),
            CreateTask(1, "Soonest", Priority.High, TaskItemStatus.Open, DateTime.UtcNow.AddHours(1)));
        await _db.SaveChangesAsync();

        var tasks = await GetFocusTasksAsync(1);

        tasks[0].Title.Should().Be("Soonest");
        tasks[1].Title.Should().Be("Sooner");
        tasks[2].Title.Should().Be("Later");
    }

    [Fact]
    public async Task FocusSort_NullDueDateLast()
    {
        _db.TaskItems.AddRange(
            CreateTask(1, "No date", Priority.High, TaskItemStatus.Open, null),
            CreateTask(1, "Has date", Priority.High, TaskItemStatus.Open, DateTime.UtcNow.AddDays(1)));
        await _db.SaveChangesAsync();

        var tasks = await GetFocusTasksAsync(1);

        tasks[0].Title.Should().Be("Has date");
        tasks[1].Title.Should().Be("No date");
    }

    [Fact]
    public async Task FocusSort_MaxThree()
    {
        for (var i = 0; i < 5; i++)
        {
            _db.TaskItems.Add(CreateTask(1, $"Task {i}", Priority.High, TaskItemStatus.Open));
        }
        await _db.SaveChangesAsync();

        var tasks = await GetFocusTasksAsync(1);

        tasks.Should().HaveCount(3);
    }

    [Fact]
    public async Task FocusSort_OnlyOpenAndInProgress()
    {
        _db.TaskItems.AddRange(
            CreateTask(1, "Open", Priority.High, TaskItemStatus.Open),
            CreateTask(1, "InProgress", Priority.High, TaskItemStatus.InProgress),
            CreateTask(1, "Done", Priority.High, TaskItemStatus.Done),
            CreateTask(1, "Idea", Priority.High, TaskItemStatus.Idea),
            CreateTask(1, "ForReview", Priority.High, TaskItemStatus.ForReview));
        await _db.SaveChangesAsync();

        var tasks = await GetFocusTasksAsync(1);

        tasks.Should().HaveCount(2);
        tasks.Select(t => t.Title).Should().BeEquivalentTo(["Open", "InProgress"]);
    }

    private async Task<List<TaskItem>> GetFocusTasksAsync(int userId)
    {
        return await _db.TaskItems
            .Where(t => t.AssigneeId == userId
                && (t.Status == TaskItemStatus.Open || t.Status == TaskItemStatus.InProgress))
            .OrderByDescending(t => t.Priority)
            .ThenBy(t => t.DueDate.HasValue ? 0 : 1)
            .ThenBy(t => t.DueDate)
            .Take(3)
            .ToListAsync();
    }

    private static TaskItem CreateTask(
        int assigneeId,
        string title,
        Priority priority,
        TaskItemStatus status,
        DateTime? dueDate = null)
    {
        return new TaskItem
        {
            Title = title,
            Priority = priority,
            Status = status,
            AssigneeId = assigneeId,
            CreatedById = assigneeId,
            DueDate = dueDate
        };
    }

    public void Dispose()
    {
        _db.Dispose();
        GC.SuppressFinalize(this);
    }
}
