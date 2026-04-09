using Baca.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
