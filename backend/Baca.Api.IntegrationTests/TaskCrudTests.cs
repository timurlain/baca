using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public class TaskCrudTests : IntegrationTestBase
{
    public TaskCrudTests(BacaWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task CreateTask_Returns201()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "New Task" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        task!.Title.Should().Be("New Task");
        task.Status.Should().Be(TaskItemStatus.Open);
    }

    [Fact]
    public async Task GetTask_IncludesSubtasksAndComments()
    {
        var client = await CreateAuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Parent Task" });
        var parent = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Subtask", ParentTaskId = parent!.Id });

        await client.PostAsJsonAsync($"/api/tasks/{parent.Id}/comments",
            new CreateCommentRequest { Text = "Test comment" });

        var response = await client.GetAsync($"/api/tasks/{parent.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await response.Content.ReadFromJsonAsync<TaskDetailDto>();
        detail.Should().NotBeNull();
        detail!.Subtasks.Should().HaveCount(1);
        detail.Comments.Should().HaveCount(1);
    }

    [Fact]
    public async Task UpdateTask_FieldsUpdated()
    {
        var client = await CreateAuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Original" });
        var task = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

        var updateResponse = await client.PutAsJsonAsync($"/api/tasks/{task!.Id}",
            new UpdateTaskRequest { Title = "Updated" });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<TaskDto>();
        updated!.Title.Should().Be("Updated");
    }

    [Fact]
    public async Task DeleteTask_CascadesSubtasks()
    {
        var client = await CreateAuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Parent" });
        var parent = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Subtask", ParentTaskId = parent!.Id });

        var deleteResponse = await client.DeleteAsync($"/api/tasks/{parent.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var remaining = await db.TaskItems.CountAsync(t => t.ParentTaskId == parent.Id);
        remaining.Should().Be(0);
    }

    [Fact]
    public async Task CreateSubtask_ParentTaskIdSetCorrectly()
    {
        var client = await CreateAuthenticatedClientAsync();

        var parentResponse = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Parent" });
        var parent = await parentResponse.Content.ReadFromJsonAsync<TaskDto>();

        var subtaskResponse = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Subtask", ParentTaskId = parent!.Id });
        subtaskResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var subtask = await subtaskResponse.Content.ReadFromJsonAsync<TaskDto>();
        subtask!.ParentTaskId.Should().Be(parent.Id);
    }

    [Fact]
    public async Task FilterByStatus_OnlyMatchingTasks()
    {
        var client = await CreateAuthenticatedClientAsync();

        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Open Task", Status = TaskItemStatus.Open });
        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Done Task", Status = TaskItemStatus.Done });

        var response = await client.GetAsync("/api/tasks?status=Done");
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskDto>>();

        tasks.Should().NotBeNull();
        tasks!.Should().AllSatisfy(t => t.Status.Should().Be(TaskItemStatus.Done));
    }

    [Fact]
    public async Task FilterByAssignee_OnlyAssignedTasks()
    {
        var client = await CreateAuthenticatedClientAsync();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var admin = await EnsureUserAsync(db, UserRole.Admin);

        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Assigned", AssigneeId = admin.Id });
        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Unassigned" });

        var response = await client.GetAsync($"/api/tasks?assignee={admin.Id}");
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskDto>>();

        tasks.Should().NotBeNull();
        tasks!.Should().AllSatisfy(t => t.AssigneeId.Should().Be(admin.Id));
    }

    [Fact]
    public async Task SearchByTitle_ILikeMatch()
    {
        var client = await CreateAuthenticatedClientAsync();

        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Build stage" });
        await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Prepare food" });

        var response = await client.GetAsync("/api/tasks?search=build");
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskDto>>();

        tasks.Should().NotBeNull();
        tasks!.Should().Contain(t => t.Title == "Build stage");
        tasks.Should().NotContain(t => t.Title == "Prepare food");
    }

    [Fact]
    public async Task ChangeStatus_StatusUpdated()
    {
        var client = await CreateAuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = "Task" });
        var task = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

        var response = await client.PatchAsJsonAsync($"/api/tasks/{task!.Id}/status",
            new StatusChangeRequest { Status = TaskItemStatus.InProgress });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var getResponse = await client.GetAsync($"/api/tasks/{task.Id}");
        var updated = await getResponse.Content.ReadFromJsonAsync<TaskDetailDto>();
        updated!.Status.Should().Be(TaskItemStatus.InProgress);
    }
}
