using Baca.Api.Data;
using Baca.Api.Models;
using Baca.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Middleware;

public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _allowTestHeaders;
    private static readonly string[] PublicPathPrefixes = ["/api/auth", "/api/health", "/api/dashboard"];

    public const string CookieName = "baca_session";

    public AuthMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _allowTestHeaders = env.EnvironmentName == "Testing";
    }

    public async Task InvokeAsync(HttpContext context, IAuthService authService, BacaDbContext db)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (IsPublicPath(path))
        {
            await _next(context);
            return;
        }

        if (_allowTestHeaders && TryGetTestHeaders(context, out var testRole, out var testUserId))
        {
            var testUser = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == testUserId, context.RequestAborted);

            if (testUser is null)
            {
                testUser = new User
                {
                    Id = testUserId,
                    Name = $"Test{testRole}",
                    Email = $"test-{testRole.ToString().ToLowerInvariant()}@baca.local",
                    Role = testRole,
                    AvatarColor = "#10B981"
                };
            }

            context.Items["User"] = testUser;
            context.Items["UserId"] = testUser.Id;
            context.Items["Role"] = testUser.Role;
            await _next(context);
            return;
        }

        var cookie = context.Request.Cookies[CookieName];
        if (string.IsNullOrEmpty(cookie))
        {
            context.Response.StatusCode = 401;
            return;
        }

        var ct = context.RequestAborted;

        var userId = await authService.ValidateSessionCookieAsync(cookie, ct);
        if (userId is null)
        {
            context.Response.StatusCode = 401;
            return;
        }

        var user = await authService.GetCurrentUserAsync(userId.Value, ct);
        if (user is null)
        {
            context.Response.StatusCode = 401;
            return;
        }

        context.Items["User"] = user;
        context.Items["UserId"] = user.Id;
        context.Items["Role"] = user.Role;

        await _next(context);
    }

    private static bool TryGetTestHeaders(HttpContext context, out UserRole role, out int userId)
    {
        role = default;
        userId = 0;

        if (!context.Request.Headers.TryGetValue("X-Test-Role", out var roleHeader))
            return false;

        if (!Enum.TryParse(roleHeader.ToString(), out role))
            return false;

        if (context.Request.Headers.TryGetValue("X-Test-User-Id", out var userIdHeader) &&
            int.TryParse(userIdHeader.ToString(), out userId))
            return true;

        // Allow role-only test header (e.g. Guest denial tests)
        userId = 0;
        return true;
    }

    private static bool IsPublicPath(string path)
    {
        foreach (var prefix in PublicPathPrefixes)
        {
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}

public static class AuthMiddlewareExtensions
{
    public static IApplicationBuilder UseBacaAuth(this IApplicationBuilder app)
    {
        return app.UseMiddleware<AuthMiddleware>();
    }
}
