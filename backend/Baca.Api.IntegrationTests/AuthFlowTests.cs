using System.Net;
using System.Net.Http.Json;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Baca.Api.IntegrationTests;

public class AuthFlowTests : IClassFixture<BacaWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly BacaWebApplicationFactory _factory;

    public AuthFlowTests(BacaWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task RequestLink_ValidEmail_Returns200()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var admin = await EnsureAdminAsync(db);

        var response = await _client.PostAsJsonAsync("/api/auth/request-link",
            new LoginRequest { Email = admin.Email! });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var token = await db.LoginTokens
            .Where(lt => lt.UserId == admin.Id)
            .OrderByDescending(lt => lt.CreatedAt)
            .FirstOrDefaultAsync();
        token.Should().NotBeNull();
    }

    [Fact]
    public async Task RequestLink_UnknownEmail_Returns404()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/request-link",
            new LoginRequest { Email = "unknown@example.com" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task VerifyToken_Valid_SetsCookie()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var admin = await EnsureAdminAsync(db);

        var loginToken = new LoginToken
        {
            UserId = admin.Id,
            Token = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
        db.LoginTokens.Add(loginToken);
        await db.SaveChangesAsync();

        var response = await _client.GetAsync($"/api/auth/verify/{loginToken.Token}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().ContainKey("Set-Cookie");

        var user = await response.Content.ReadFromJsonAsync<AuthResponse>();
        user.Should().NotBeNull();
        user!.Name.Should().Be(admin.Name);
    }

    [Fact]
    public async Task VerifyToken_Expired_Returns401()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var admin = await EnsureAdminAsync(db);

        var loginToken = new LoginToken
        {
            UserId = admin.Id,
            Token = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
        };
        db.LoginTokens.Add(loginToken);
        await db.SaveChangesAsync();

        var response = await _client.GetAsync($"/api/auth/verify/{loginToken.Token}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GuestLogin_CorrectPin_SetsCookie()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        await EnsureGuestPinAsync(db);

        var response = await _client.PostAsJsonAsync("/api/auth/guest",
            new GuestLoginRequest { Pin = "ovcina2026" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().ContainKey("Set-Cookie");

        var user = await response.Content.ReadFromJsonAsync<AuthResponse>();
        user.Should().NotBeNull();
        user!.Role.Should().Be(UserRole.Guest);
    }

    [Fact]
    public async Task GuestLogin_WrongPin_Returns401()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        await EnsureGuestPinAsync(db);

        var response = await _client.PostAsJsonAsync("/api/auth/guest",
            new GuestLoginRequest { Pin = "wrongpin" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_ClearsCookie()
    {
        var authenticatedClient = await CreateAuthenticatedClientAsync();

        var response = await authenticatedClient.PostAsync("/api/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Me_Authenticated_ReturnsUser()
    {
        var authenticatedClient = await CreateAuthenticatedClientAsync();

        var response = await authenticatedClient.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.Content.ReadFromJsonAsync<AuthResponse>();
        user.Should().NotBeNull();
    }

    [Fact]
    public async Task Me_Unauthenticated_Returns401()
    {
        var response = await _client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<User> EnsureAdminAsync(BacaDbContext db)
    {
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == "test-admin@baca.local");
        if (admin is not null)
            return admin;

        admin = new User
        {
            Name = "TestAdmin",
            Email = "test-admin@baca.local",
            Role = UserRole.Admin,
            AvatarColor = "#10B981"
        };
        db.Users.Add(admin);
        await db.SaveChangesAsync();
        return admin;
    }

    private static async Task EnsureGuestPinAsync(BacaDbContext db)
    {
        var settings = await db.AppSettings.FindAsync(1);
        if (settings is not null)
            return;

        var hashedPin = BCrypt.Net.BCrypt.HashPassword("ovcina2026");
        db.AppSettings.Add(new AppSettings { Id = 1, GuestPin = hashedPin });
        await db.SaveChangesAsync();
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var admin = await EnsureAdminAsync(db);

        var loginToken = new LoginToken
        {
            UserId = admin.Id,
            Token = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
        db.LoginTokens.Add(loginToken);
        await db.SaveChangesAsync();

        var client = _factory.CreateClient();

        await client.GetAsync($"/api/auth/verify/{loginToken.Token}");
        return client;
    }
}
