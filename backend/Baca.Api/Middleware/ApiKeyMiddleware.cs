using Baca.Api.Data;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Middleware;

public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string? _apiKey;

    public ApiKeyMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _apiKey = config["ApiKey:Secret"];
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only process if not already authenticated and API key is configured
        if (_apiKey is not null
            && context.User.Identity?.IsAuthenticated != true
            && context.Request.Headers.TryGetValue("X-Api-Key", out var providedKey)
            && string.Equals(providedKey, _apiKey, StringComparison.Ordinal))
        {
            // Find or create the bot user
            var db = context.RequestServices.GetRequiredService<BacaDbContext>();
            var botUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "bot@baca.ovcina.cz");
            if (botUser is null)
            {
                botUser = new User
                {
                    Name = "Ovčina Bot",
                    Email = "bot@baca.ovcina.cz",
                    Role = UserRole.User,
                    AvatarColor = "#6366F1",
                    IsActive = true,
                };
                db.Users.Add(botUser);
                await db.SaveChangesAsync();
            }

            context.Items["UserId"] = botUser.Id;
            context.Items["Role"] = botUser.Role;
        }

        await _next(context);
    }
}
