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
                return Results.Json(new { error = "not_authenticated", detail = "No valid auth cookie found. Try logging in again." }, statusCode: 401);

            var localUserIdStr = user.FindFirstValue("local_user_id");
            if (!int.TryParse(localUserIdStr, out var localUserId))
            {
                // Authenticated via OIDC but no local user mapped — show diagnostic
                var sub = user.FindFirstValue("sub");
                var name = user.FindFirstValue("name");
                var email = user.FindFirstValue("email");
                return Results.Json(new
                {
                    error = "no_local_user",
                    detail = "Přihlášení proběhlo, ale lokální účet nebyl vytvořen. Zkuste se odhlásit a přihlásit znovu.",
                    oidcSub = sub,
                    oidcName = name,
                    oidcEmail = email,
                    claims = user.Claims.Select(c => new { c.Type, c.Value }).ToList(),
                }, statusCode: 403);
            }

            // Fetch from DB to get current avatar color and role
            var dbUser = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == localUserId, ct);

            if (dbUser is null)
                return Results.Json(new { error = "user_not_found", detail = $"Lokální uživatel #{localUserId} nebyl nalezen v databázi.", localUserId }, statusCode: 403);

            if (dbUser.IsDeleted || !dbUser.IsActive)
                return Results.Json(new { error = "user_deactivated", detail = "Váš účet byl deaktivován. Kontaktujte organizátora.", localUserId, isDeleted = dbUser.IsDeleted, isActive = dbUser.IsActive }, statusCode: 403);

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
