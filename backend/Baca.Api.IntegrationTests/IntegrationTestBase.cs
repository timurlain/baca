using Baca.Api.Data;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public abstract class IntegrationTestBase : IClassFixture<BacaWebApplicationFactory>
{
    private readonly BacaWebApplicationFactory _factory;
    protected BacaWebApplicationFactory Factory => _factory;

    protected IntegrationTestBase(BacaWebApplicationFactory factory)
    {
        _factory = factory;
    }

    protected async Task<HttpClient> CreateAuthenticatedClientAsync(UserRole role = UserRole.Admin)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();

        var user = role switch
        {
            UserRole.Guest => await EnsureGuestLoginAsync(db),
            _ => await EnsureUserAsync(db, role)
        };

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", role.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", user.Id.ToString(System.Globalization.CultureInfo.InvariantCulture));
        return client;
    }

    protected static async Task<User> EnsureUserAsync(BacaDbContext db, UserRole role)
    {
        var email = $"test-{role.ToString().ToLowerInvariant()}@baca.local";
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is not null)
            return user;

        user = new User
        {
            Name = $"Test{role}",
            Email = email,
            Role = role,
            AvatarColor = "#10B981"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<User> EnsureGuestLoginAsync(BacaDbContext db)
    {
        var guest = await db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Guest);
        if (guest is not null)
            return guest;

        guest = new User { Name = "Host", Role = UserRole.Guest, AvatarColor = "#9CA3AF" };
        db.Users.Add(guest);
        await db.SaveChangesAsync();
        return guest;
    }

    protected static async Task<TaskItem> CreateTestTaskAsync(
        BacaDbContext db,
        int createdById,
        string title = "Test Task",
        TaskItemStatus status = TaskItemStatus.Open)
    {
        var task = new TaskItem
        {
            Title = title,
            Status = status,
            Priority = Priority.Medium,
            CreatedById = createdById
        };
        db.TaskItems.Add(task);
        await db.SaveChangesAsync();
        return task;
    }
}
