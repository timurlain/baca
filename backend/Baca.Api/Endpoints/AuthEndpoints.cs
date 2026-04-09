using System.Security.Claims;
using Baca.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/login", (HttpContext context, string? returnUrl) =>
        {
            // Prevent open redirects
            if (string.IsNullOrEmpty(returnUrl) || !Uri.IsWellFormedUriString(returnUrl, UriKind.Relative))
                returnUrl = "/";

            var properties = new AuthenticationProperties { RedirectUri = returnUrl };
            return Results.Challenge(properties, [OpenIdConnectDefaults.AuthenticationScheme]);
        });

        group.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok();
        });

        group.MapGet("/me", async (HttpContext context, BacaDbContext db, CancellationToken ct) =>
        {
            var user = context.User;
            if (user.Identity?.IsAuthenticated != true)
                return Results.Unauthorized();

            var localUserIdStr = user.FindFirstValue("local_user_id");
            if (!int.TryParse(localUserIdStr, out var localUserId))
                return Results.Unauthorized();

            // Fetch from DB to get current avatar color and role
            var dbUser = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == localUserId, ct);

            if (dbUser is null || dbUser.IsDeleted || !dbUser.IsActive)
                return Results.Unauthorized();

            return Results.Ok(new
            {
                id = dbUser.Id,
                name = dbUser.Name,
                email = dbUser.Email ?? "",
                role = dbUser.Role.ToString(),
                avatarColor = dbUser.AvatarColor,
            });
        }).RequireAuthorization();
    }
}
