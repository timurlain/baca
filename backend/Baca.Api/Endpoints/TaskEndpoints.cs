using Baca.Api.DTOs;
using Baca.Api.Models;

namespace Baca.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks");

        group.MapGet("/", (TaskItemStatus? status, int? category, int? assignee, string? search, int? parentId) =>
            Results.StatusCode(501));

        group.MapGet("/{id:int}", (int id) =>
            Results.StatusCode(501));

        group.MapPost("/", (CreateTaskRequest request) =>
            Results.StatusCode(501));

        group.MapPut("/{id:int}", (int id, UpdateTaskRequest request) =>
            Results.StatusCode(501));

        group.MapPatch("/{id:int}/status", (int id, StatusChangeRequest request) =>
            Results.StatusCode(501));

        group.MapPatch("/{id:int}/sort", (int id, SortChangeRequest request) =>
            Results.StatusCode(501));

        group.MapPatch("/{id:int}/assign-me", (int id) =>
            Results.StatusCode(501));

        group.MapDelete("/{id:int}", (int id) =>
            Results.StatusCode(501));
    }
}
