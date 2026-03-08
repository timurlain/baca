using Baca.Api.Data;
using Baca.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        app.MapGet("/api/health", async (BacaDbContext db, CancellationToken ct) =>
        {
            var dbStatus = "ok";
            try
            {
                await db.Database.CanConnectAsync(ct);
            }
            catch
            {
                dbStatus = "error";
            }

            return Results.Ok(new HealthResponse(
                Status: "healthy",
                Db: dbStatus
            ));
        });
    }
}
