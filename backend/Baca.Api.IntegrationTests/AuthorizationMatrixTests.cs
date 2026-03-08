using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public class AuthorizationMatrixTests : IntegrationTestBase
{
    public AuthorizationMatrixTests(BacaWebApplicationFactory factory) : base(factory)
    {
    }

    public static TheoryData<string, string, UserRole, bool> GetAuthorizationMatrix()
    {
        var data = new TheoryData<string, string, UserRole, bool>();

        // GET /api/tasks — all roles allowed
        data.Add("GET", "/api/tasks", UserRole.Guest, true);
        data.Add("GET", "/api/tasks", UserRole.User, true);
        data.Add("GET", "/api/tasks", UserRole.Admin, true);

        // GET /api/tasks/{id} — all roles allowed
        data.Add("GET", "/api/tasks/{taskId}", UserRole.Guest, true);
        data.Add("GET", "/api/tasks/{taskId}", UserRole.User, true);
        data.Add("GET", "/api/tasks/{taskId}", UserRole.Admin, true);

        // POST /api/tasks — Guest blocked
        data.Add("POST", "/api/tasks", UserRole.Guest, false);
        data.Add("POST", "/api/tasks", UserRole.User, true);
        data.Add("POST", "/api/tasks", UserRole.Admin, true);

        // PUT /api/tasks/{id} — Guest blocked
        data.Add("PUT", "/api/tasks/{taskId}", UserRole.Guest, false);
        data.Add("PUT", "/api/tasks/{taskId}", UserRole.User, true);
        data.Add("PUT", "/api/tasks/{taskId}", UserRole.Admin, true);

        // PATCH /api/tasks/{id}/status — Guest blocked
        data.Add("PATCH_STATUS", "/api/tasks/{taskId}/status", UserRole.Guest, false);
        data.Add("PATCH_STATUS", "/api/tasks/{taskId}/status", UserRole.User, true);
        data.Add("PATCH_STATUS", "/api/tasks/{taskId}/status", UserRole.Admin, true);

        // PATCH /api/tasks/{id}/assign-me — Guest blocked
        data.Add("PATCH_ASSIGN", "/api/tasks/{taskId}/assign-me", UserRole.Guest, false);
        data.Add("PATCH_ASSIGN", "/api/tasks/{taskId}/assign-me", UserRole.User, true);
        data.Add("PATCH_ASSIGN", "/api/tasks/{taskId}/assign-me", UserRole.Admin, true);

        // DELETE /api/tasks/{id} — Guest blocked
        data.Add("DELETE", "/api/tasks/{taskId}", UserRole.Guest, false);
        data.Add("DELETE", "/api/tasks/{taskId}", UserRole.User, true);
        data.Add("DELETE", "/api/tasks/{taskId}", UserRole.Admin, true);

        // POST /api/tasks/{id}/comments — Guest blocked
        data.Add("POST_COMMENT", "/api/tasks/{taskId}/comments", UserRole.Guest, false);
        data.Add("POST_COMMENT", "/api/tasks/{taskId}/comments", UserRole.User, true);
        data.Add("POST_COMMENT", "/api/tasks/{taskId}/comments", UserRole.Admin, true);

        // GET /api/tasks/{id}/comments — all roles allowed
        data.Add("GET_COMMENTS", "/api/tasks/{taskId}/comments", UserRole.Guest, true);
        data.Add("GET_COMMENTS", "/api/tasks/{taskId}/comments", UserRole.User, true);
        data.Add("GET_COMMENTS", "/api/tasks/{taskId}/comments", UserRole.Admin, true);

        // GET /api/focus — Guest blocked
        data.Add("GET", "/api/focus", UserRole.Guest, false);
        data.Add("GET", "/api/focus", UserRole.User, true);
        data.Add("GET", "/api/focus", UserRole.Admin, true);

        // NOTE: Category, User, Settings endpoints are Agent B's territory.
        // They currently return 501 stubs. Once Agent B implements them,
        // uncomment these lines to test their authorization:
        //
        // GET /api/categories — all roles
        // data.Add("GET", "/api/categories", UserRole.Guest, true);
        // data.Add("GET", "/api/categories", UserRole.User, true);
        // data.Add("GET", "/api/categories", UserRole.Admin, true);
        //
        // POST /api/categories — Admin only
        // data.Add("POST_CATEGORY", "/api/categories", UserRole.Guest, false);
        // data.Add("POST_CATEGORY", "/api/categories", UserRole.User, false);
        // data.Add("POST_CATEGORY", "/api/categories", UserRole.Admin, true);
        //
        // GET /api/users — Admin only
        // data.Add("GET", "/api/users", UserRole.Guest, false);
        // data.Add("GET", "/api/users", UserRole.User, false);
        // data.Add("GET", "/api/users", UserRole.Admin, true);
        //
        // GET /api/settings — Admin only
        // data.Add("GET", "/api/settings", UserRole.Guest, false);
        // data.Add("GET", "/api/settings", UserRole.User, false);
        // data.Add("GET", "/api/settings", UserRole.Admin, true);

        return data;
    }

    [Theory]
    [MemberData(nameof(GetAuthorizationMatrix))]
    public async Task AuthorizationMatrix_EndpointRoleCombination(
        string method,
        string path,
        UserRole role,
        bool shouldSucceed)
    {
        var client = await CreateAuthenticatedClientAsync(role);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = role == UserRole.Guest
            ? await db.Users.FirstAsync(u => u.Role == UserRole.Guest)
            : await EnsureUserAsync(db, role);

        var taskId = await EnsureTestTaskExistsAsync(db, user.Id);
        path = path.Replace("{taskId}", taskId.ToString(System.Globalization.CultureInfo.InvariantCulture));

        var response = await SendRequestAsync(client, method, path, taskId);

        if (shouldSucceed)
        {
            response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized,
                $"{method} {path} for {role} should succeed");
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                $"{method} {path} for {role} should succeed");
        }
        else
        {
            var statusCode = (int)response.StatusCode;
            statusCode.Should().BeOneOf([401, 403],
                $"{method} {path} for {role} should be blocked");
        }
    }

    [Fact]
    public async Task Unauthenticated_AllProtectedEndpoints_Return401()
    {
        var client = Factory.CreateClient();

        var endpoints = new[]
        {
            ("GET", "/api/tasks"),
            ("GET", "/api/focus"),
            ("GET", "/api/categories"),
            ("GET", "/api/users"),
            ("GET", "/api/settings"),
        };

        foreach (var (method, path) in endpoints)
        {
            var response = method == "GET"
                ? await client.GetAsync(path)
                : await client.PostAsync(path, null);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
                $"Unauthenticated {method} {path} should return 401");
        }
    }

    private static async Task<int> EnsureTestTaskExistsAsync(BacaDbContext db, int userId)
    {
        var task = await db.TaskItems.FirstOrDefaultAsync(t => t.CreatedById == userId);
        if (task is not null)
            return task.Id;

        task = new TaskItem
        {
            Title = "AuthMatrix Test Task",
            Status = TaskItemStatus.Open,
            CreatedById = userId
        };
        db.TaskItems.Add(task);
        await db.SaveChangesAsync();
        return task.Id;
    }

    private static async Task<HttpResponseMessage> SendRequestAsync(
        HttpClient client,
        string method,
        string path,
        int taskId)
    {
        return method switch
        {
            "GET" => await client.GetAsync(path),
            "GET_COMMENTS" => await client.GetAsync(path),
            "POST" => await client.PostAsJsonAsync(path,
                new CreateTaskRequest { Title = "Matrix Test" }),
            "POST_COMMENT" => await client.PostAsJsonAsync(path,
                new CreateCommentRequest { Text = "Matrix comment" }),
            "POST_CATEGORY" => await client.PostAsJsonAsync(path,
                new { Name = $"Cat-{Guid.NewGuid():N}"[..20], Color = "#FF0000" }),
            "PUT" => await client.PutAsJsonAsync(path,
                new UpdateTaskRequest { Title = "Updated" }),
            "PATCH_STATUS" => await client.PatchAsJsonAsync(path,
                new StatusChangeRequest { Status = TaskItemStatus.InProgress }),
            "PATCH_ASSIGN" => await client.PatchAsync(path, null),
            "DELETE" => await client.DeleteAsync(path),
            _ => throw new ArgumentException($"Unknown method: {method}")
        };
    }
}
