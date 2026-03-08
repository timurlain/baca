using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public class TaskDragDropTests : IntegrationTestBase
{
    public TaskDragDropTests(BacaWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task MoveToNewColumn_StatusAndSortOrderChange()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response1 = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Task A", Status = TaskItemStatus.Open });
        var taskA = await response1.Content.ReadFromJsonAsync<TaskDto>();

        var moveResponse = await client.PatchAsJsonAsync($"/api/tasks/{taskA!.Id}/status",
            new StatusChangeRequest { Status = TaskItemStatus.InProgress, SortOrder = 0 });

        moveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var getResponse = await client.GetAsync($"/api/tasks/{taskA.Id}");
        var updated = await getResponse.Content.ReadFromJsonAsync<TaskDetailDto>();
        updated!.Status.Should().Be(TaskItemStatus.InProgress);
        updated.SortOrder.Should().Be(0);
    }

    [Fact]
    public async Task ReorderInColumn_SortOrderUpdated()
    {
        var client = await CreateAuthenticatedClientAsync();

        var r1 = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "First", Status = TaskItemStatus.Open });
        var r2 = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Second", Status = TaskItemStatus.Open });
        var r3 = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Third", Status = TaskItemStatus.Open });

        var task3 = await r3.Content.ReadFromJsonAsync<TaskDto>();

        var sortResponse = await client.PatchAsJsonAsync($"/api/tasks/{task3!.Id}/sort",
            new SortChangeRequest { SortOrder = 0 });

        sortResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var listResponse = await client.GetAsync("/api/tasks?status=Open");
        var tasks = await listResponse.Content.ReadFromJsonAsync<List<TaskDto>>();

        tasks.Should().NotBeNull();
        var reordered = tasks!.OrderBy(t => t.SortOrder).ToList();
        reordered[0].Title.Should().Be("Third");
    }

    [Fact]
    public async Task ConcurrentMoves_NoDataCorruption()
    {
        var client = await CreateAuthenticatedClientAsync();

        var tasks = new List<TaskDto>();
        for (var i = 0; i < 5; i++)
        {
            var r = await client.PostAsJsonAsync("/api/tasks",
                new CreateTaskRequest { Title = $"Task {i}", Status = TaskItemStatus.Open });
            var t = await r.Content.ReadFromJsonAsync<TaskDto>();
            tasks.Add(t!);
        }

        var moveTask1 = client.PatchAsJsonAsync($"/api/tasks/{tasks[0].Id}/sort",
            new SortChangeRequest { SortOrder = 4 });
        var moveTask2 = client.PatchAsJsonAsync($"/api/tasks/{tasks[4].Id}/sort",
            new SortChangeRequest { SortOrder = 0 });

        await Task.WhenAll(moveTask1, moveTask2);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var allTasks = await db.TaskItems
            .Where(t => tasks.Select(x => x.Id).Contains(t.Id))
            .ToListAsync();

        allTasks.Should().HaveCount(5);
        allTasks.Should().OnlyContain(t => t.Status == TaskItemStatus.Open);
    }
}
