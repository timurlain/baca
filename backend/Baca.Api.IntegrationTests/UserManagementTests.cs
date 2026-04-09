using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class UserManagementTests
{
    [Fact(DisplayName = "CreateUser")]
    public async Task CreateUser()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "Honza",
            Email = "honza@baca.local",
            Phone = "+420123456789",
            Role = UserRole.User
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await dbContext.Users.SingleAsync(existingUser => existingUser.Email == "honza@baca.local");
        user.Name.Should().Be("Honza");
        user.Phone.Should().Be("+420123456789");
    }

    [Fact(DisplayName = "UpdateUser_ChangeRole")]
    public async Task UpdateUserChangeRole()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Petr", "petr@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/2", new UpdateUserRequest
        {
            Role = UserRole.Admin
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await dbContext.Users.SingleAsync(existingUser => existingUser.Id == 2);
        user.Role.Should().Be(UserRole.Admin);
    }

    [Fact(DisplayName = "DeactivateUser")]
    public async Task DeactivateUser()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Petr", "petr@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/2", new UpdateUserRequest
        {
            IsActive = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await dbContext.Users.SingleAsync(existingUser => existingUser.Id == 2);
        user.IsActive.Should().BeFalse();
    }

    [Fact(DisplayName = "DeleteUser_HasTasks")]
    public async Task DeleteUserHasTasks()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserWithAssignedTaskAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/users/2");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    private static BacaWebApplicationFactory CreateFactory()
    {
        return new BacaWebApplicationFactory();
    }

    private static HttpClient CreateAdminClient(BacaWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Admin.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "1");
        return client;
    }

    private static async Task ResetDatabaseAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.MigrateAsync();
    }

    private static async Task SeedAdminAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        dbContext.Users.Add(new User
        {
            Id = 1,
            Name = "Admin",
            Email = "admin@baca.local",
            Role = UserRole.Admin,
            AvatarColor = "#10B981"
        });
        await dbContext.SaveChangesAsync();
        await SyncUserSequenceAsync(dbContext);
    }

    private static async Task SeedUserAsync(IServiceProvider services, int id, string name, string email, UserRole role)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        dbContext.Users.Add(new User
        {
            Id = id,
            Name = name,
            Email = email,
            Role = role,
            AvatarColor = "#3B82F6"
        });
        await dbContext.SaveChangesAsync();
        await SyncUserSequenceAsync(dbContext);
    }

    private static async Task SeedUserWithAssignedTaskAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BacaDbContext>();

        dbContext.Users.AddRange(
            new User
            {
                Id = 2,
                Name = "Petr",
                Email = "petr@baca.local",
                Role = UserRole.User,
                AvatarColor = "#3B82F6"
            },
            new User
            {
                Id = 3,
                Name = "Zakladatel",
                Email = "zakladatel@baca.local",
                Role = UserRole.User,
                AvatarColor = "#F59E0B"
            });

        dbContext.TaskItems.Add(new TaskItem
        {
            Title = "Připravený úkol",
            Status = TaskItemStatus.Open,
            Priority = Priority.Medium,
            AssigneeId = 2,
            CreatedById = 3,
            UpdatedAt = new DateTime(2026, 3, 8, 10, 0, 0, DateTimeKind.Utc)
        });

        await dbContext.SaveChangesAsync();
        await SyncUserSequenceAsync(dbContext);
    }

    private static Task<int> SyncUserSequenceAsync(BacaDbContext dbContext)
    {
        return dbContext.Database.ExecuteSqlRawAsync(
            """
            SELECT setval(
                pg_get_serial_sequence('"Users"', 'Id'),
                COALESCE((SELECT MAX("Id") FROM "Users"), 1),
                true);
            """);
    }

}
