using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public sealed class UserEdgeCaseTests
{
    [Fact(DisplayName = "CreateUser_GuestRole_Returns400")]
    public async Task CreateUserGuestRole()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "Ghost",
            Email = "ghost@baca.local",
            Role = UserRole.Guest
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateUser_DuplicateEmail_Returns409")]
    public async Task CreateUserDuplicateEmail()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Existing", "existing@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "Duplicate",
            Email = "existing@baca.local",
            Role = UserRole.User
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "CreateUser_EmptyName_Returns400")]
    public async Task CreateUserEmptyName()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "   ",
            Email = "blank@baca.local",
            Role = UserRole.User
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateUser_EmptyEmail_Returns400")]
    public async Task CreateUserEmptyEmail()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "NoEmail",
            Email = "",
            Role = UserRole.User
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateUser_InvalidPhone_Returns400")]
    public async Task CreateUserInvalidPhone()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "BadPhone",
            Email = "badphone@baca.local",
            Phone = "123456789",
            Role = UserRole.User
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "CreateUser_ValidPhone_Accepted")]
    public async Task CreateUserValidPhone()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "GoodPhone",
            Email = "goodphone@baca.local",
            Phone = "+420123456789",
            Role = UserRole.User
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact(DisplayName = "CreateUser_NonExistentGameRole_Returns400")]
    public async Task CreateUserNonExistentGameRole()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "BadRole",
            Email = "badrole@baca.local",
            Role = UserRole.User,
            GameRoleId = 9999
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateUser_EmptyName_Returns400")]
    public async Task UpdateUserEmptyName()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Petr", "petr@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/2", new UpdateUserRequest
        {
            Name = ""
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateUser_GuestRole_Returns400")]
    public async Task UpdateUserGuestRole()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Petr", "petr@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/2", new UpdateUserRequest
        {
            Role = UserRole.Guest
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateUser_NotFound_Returns404")]
    public async Task UpdateUserNotFound()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/9999", new UpdateUserRequest
        {
            Name = "Ghost"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "DeactivateSelf_Returns409")]
    public async Task DeactivateSelf()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        // Admin is user Id=1, X-Test-User-Id=1
        var response = await client.PutAsJsonAsync("/api/users/1", new UpdateUserRequest
        {
            IsActive = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "DeleteSelf_Returns409")]
    public async Task DeleteSelf()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/users/1");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "DeleteUser_NoTasks_Succeeds")]
    public async Task DeleteUserNoTasks()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "ToDelete", "todelete@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/users/2");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact(DisplayName = "DeleteUser_NotFound_Returns404")]
    public async Task DeleteUserNotFound()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.DeleteAsync("/api/users/9999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "ResendLink_NotFound_Returns404")]
    public async Task ResendLinkNotFound()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        using var client = CreateAdminClient(factory);

        var response = await client.PostAsync("/api/users/9999/resend-link", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "ResendLink_UserWithNoEmail_Returns400")]
    public async Task ResendLinkNoEmail()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);

        // Create user without email
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
            db.Users.Add(new User
            {
                Id = 2,
                Name = "NoEmail",
                Email = null,
                Role = UserRole.User,
                AvatarColor = "#3B82F6"
            });
            await db.SaveChangesAsync();
        }

        using var client = CreateAdminClient(factory);

        var response = await client.PostAsync("/api/users/2/resend-link", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "GetUsers_NonAdmin_Returns403")]
    public async Task GetUsersNonAdmin()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();
        // Use a user ID that does not exist in the seeded DB, so the middleware
        // falls back to a synthetic test user with the header-specified role.
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.User.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "99");

        var response = await client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact(DisplayName = "UpdateUser_InvalidPhone_Returns400")]
    public async Task UpdateUserInvalidPhone()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Petr", "petr@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/2", new UpdateUserRequest
        {
            Phone = "not-a-phone"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "UpdateUser_NonExistentGameRole_Returns400")]
    public async Task UpdateUserNonExistentGameRole()
    {
        await using var factory = CreateFactory();
        await factory.InitializeAsync();
        await ResetDatabaseAsync(factory.Services);
        await SeedAdminAsync(factory.Services);
        await SeedUserAsync(factory.Services, 2, "Petr", "petr@baca.local", UserRole.User);
        using var client = CreateAdminClient(factory);

        var response = await client.PutAsJsonAsync("/api/users/2", new UpdateUserRequest
        {
            GameRoleId = 9999
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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
