using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/settings");

        group.MapGet("/", GetSettingsAsync);
        group.MapPut("/", UpdateSettingsAsync);
    }

    private static async Task<IResult> GetSettingsAsync(
        BacaDbContext dbContext,
        CancellationToken ct)
    {
        var settings = await GetOrCreateSettingsAsync(dbContext, ct);
        return TypedResults.Ok(MapSettings(settings));
    }

    private static async Task<IResult> UpdateSettingsAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        UpdateSettingsRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var settings = await GetOrCreateSettingsAsync(dbContext, ct);

        if (!string.IsNullOrWhiteSpace(request.GuestPin))
        {
            settings.GuestPin = BCrypt.Net.BCrypt.HashPassword(request.GuestPin.Trim());
        }

        if (request.AppName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.AppName))
            {
                return Results.BadRequest("Název aplikace je povinný.");
            }

            settings.AppName = request.AppName.Trim();
        }

        await dbContext.SaveChangesAsync(ct);
        return TypedResults.Ok(MapSettings(settings));
    }

    private static async Task<AppSettings> GetOrCreateSettingsAsync(
        BacaDbContext dbContext,
        CancellationToken ct)
    {
        var settings = await dbContext.AppSettings.FirstOrDefaultAsync(setting => setting.Id == 1, ct);
        if (settings is not null)
        {
            return settings;
        }

        settings = new AppSettings
        {
            Id = 1,
            AppName = "Bača",
            GuestPin = string.Empty
        };

        dbContext.AppSettings.Add(settings);
        await dbContext.SaveChangesAsync(ct);
        return settings;
    }

    private static AppSettingsDto MapSettings(AppSettings settings)
    {
        return new AppSettingsDto
        {
            GuestPin = string.Empty,
            AppName = settings.AppName
        };
    }
}
