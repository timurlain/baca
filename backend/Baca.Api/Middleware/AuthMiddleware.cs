using Baca.Api.Services;

namespace Baca.Api.Middleware;

public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly string[] PublicPathPrefixes = ["/api/auth", "/api/health"];

    public const string CookieName = "baca_session";

    public AuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAuthService authService)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (IsPublicPath(path))
        {
            await _next(context);
            return;
        }

        var cookie = context.Request.Cookies[CookieName];
        if (string.IsNullOrEmpty(cookie))
        {
            context.Response.StatusCode = 401;
            return;
        }

        var userId = await authService.ValidateSessionCookieAsync(cookie);
        if (userId is null)
        {
            context.Response.StatusCode = 401;
            return;
        }

        var user = await authService.GetCurrentUserAsync(userId.Value);
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
