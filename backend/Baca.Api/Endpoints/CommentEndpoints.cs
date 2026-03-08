using Baca.Api.DTOs;

namespace Baca.Api.Endpoints;

public static class CommentEndpoints
{
    public static void MapCommentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks/{taskId:int}/comments");

        group.MapGet("/", (int taskId) =>
            Results.StatusCode(501));

        group.MapPost("/", (int taskId, CreateCommentRequest request) =>
            Results.StatusCode(501));
    }
}
