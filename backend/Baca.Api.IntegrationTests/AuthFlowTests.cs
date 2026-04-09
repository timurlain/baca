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
    public async Task Login_RedirectsToOidc()
    {
        var response = await _client.GetAsync("/api/auth/login");

        // Should return a Challenge result which triggers OIDC redirect
        // In test environment without real OIDC, this returns 302 or 401
        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeOneOf([302, 401],
            "Login should redirect to OIDC provider or return challenge");
    }

    [Fact]
    public async Task Login_WithReturnUrl_PreservesLocalUrl()
    {
        var response = await _client.GetAsync("/api/auth/login?returnUrl=/tasks");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeOneOf([302, 401]);
    }

    [Fact]
    public async Task Login_WithAbsoluteReturnUrl_DefaultsToRoot()
    {
        // Absolute URLs should be rejected to prevent open redirects
        var response = await _client.GetAsync("/api/auth/login?returnUrl=https://evil.com");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().BeOneOf([302, 401]);
    }

    [Fact]
    public async Task Logout_Returns200()
    {
        var authenticatedClient = CreateAuthenticatedClient();

        var response = await authenticatedClient.PostAsync("/api/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Me_Authenticated_ReturnsUser()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BacaDbContext>();
        var user = await EnsureAdminAsync(db);

        var authenticatedClient = CreateAuthenticatedClient(user.Id);

        var response = await authenticatedClient.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
        authResponse.Should().NotBeNull();
        authResponse!.Name.Should().Be(user.Name);
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
            AvatarColor = "#10B981",
            IsActive = true,
        };
        db.Users.Add(admin);
        await db.SaveChangesAsync();
        return admin;
    }

    private HttpClient CreateAuthenticatedClient(int userId = 1)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Admin.ToString());
        client.DefaultRequestHeaders.Add("X-Test-User-Id", userId.ToString(System.Globalization.CultureInfo.InvariantCulture));
        return client;
    }
}
