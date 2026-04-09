using System.Security.Claims;
using System.Text.Encodings.Web;
using Baca.Api.Data;
using Baca.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Testcontainers.PostgreSql;

namespace Baca.Api.IntegrationTests;

public class BacaWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly Action<IServiceCollection>? _configureServices;
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16")
        .WithDatabase("baca_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public BacaWebApplicationFactory() { }

    internal BacaWebApplicationFactory(Action<IServiceCollection> configureServices)
    {
        _configureServices = configureServices;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<BacaDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Add test database
            services.AddDbContext<BacaDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));

            // Replace OIDC authentication with a test scheme that reads X-Test-* headers
            services.AddAuthentication(options =>
            {
                options.DefaultScheme = "TestScheme";
                options.DefaultAuthenticateScheme = "TestScheme";
                options.DefaultChallengeScheme = "TestScheme";
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", _ => { });

            // Custom service overrides run last so they can replace defaults
            _configureServices?.Invoke(services);
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }
}

/// <summary>
/// Test authentication handler that creates an authenticated principal from X-Test-Role and X-Test-User-Id headers.
/// </summary>
internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-Role", out var roleHeader) ||
            !Request.Headers.TryGetValue("X-Test-User-Id", out var userIdHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var roleStr = roleHeader.ToString();
        var userIdStr = userIdHeader.ToString();

        if (!Enum.TryParse<UserRole>(roleStr, out var role) || !int.TryParse(userIdStr, out _))
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid test headers"));
        }

        var claims = new[]
        {
            new Claim("sub", $"test-{userIdStr}"),
            new Claim("name", $"Test{roleStr}"),
            new Claim("email", $"test-{roleStr.ToLowerInvariant()}@baca.local"),
            new Claim("local_user_id", userIdStr),
            new Claim("local_user_role", role.ToString()),
            new Claim("local_avatar_color", "#10B981"),
        };

        var identity = new ClaimsIdentity(claims, "TestScheme");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestScheme");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
