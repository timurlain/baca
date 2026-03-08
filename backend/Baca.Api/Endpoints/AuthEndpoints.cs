using Baca.Api.DTOs;
using Baca.Api.Middleware;
using Baca.Api.Models;
using Baca.Api.Services;

namespace Baca.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/request-link", RequestLinkAsync);
        group.MapGet("/verify/{token}", VerifyTokenAsync);
        group.MapPost("/guest", GuestLoginAsync);
        group.MapPost("/logout", Logout);
        group.MapGet("/me", GetMeAsync);
    }

    private static async Task<IResult> RequestLinkAsync(
        LoginRequest request,
        IAuthService authService,
        CancellationToken ct)
    {
        var sent = await authService.RequestMagicLinkAsync(request.Email, ct);
        return sent ? Results.Ok() : Results.NotFound();
    }

    private static async Task<IResult> VerifyTokenAsync(
        string token,
        IAuthService authService,
        HttpContext context,
        CancellationToken ct)
    {
        var user = await authService.VerifyTokenAsync(token, ct);
        if (user is null)
            return Results.Unauthorized();

        var cookie = await authService.GenerateSessionCookieAsync(user.Id, ct);
        SetSessionCookie(context, cookie);

        return Results.Ok(user);
    }

    private static async Task<IResult> GuestLoginAsync(
        GuestLoginRequest request,
        IAuthService authService,
        HttpContext context,
        CancellationToken ct)
    {
        var guest = await authService.VerifyGuestPinAsync(request.Pin, ct);
        if (guest is null)
            return Results.Unauthorized();

        var cookie = await authService.GenerateSessionCookieAsync(guest.Id, ct);
        SetSessionCookie(context, cookie);

        return Results.Ok(guest);
    }

    private static IResult Logout(HttpContext context)
    {
        context.Response.Cookies.Delete(AuthMiddleware.CookieName, new CookieOptions
        {
            Path = "/",
            HttpOnly = true
        });
        return Results.Ok();
    }

    private static async Task<IResult> GetMeAsync(
        HttpContext context,
        IAuthService authService,
        CancellationToken ct)
    {
        var cookie = context.Request.Cookies[AuthMiddleware.CookieName];
        if (string.IsNullOrEmpty(cookie))
            return Results.Unauthorized();

        var userId = await authService.ValidateSessionCookieAsync(cookie, ct);
        if (userId is null)
            return Results.Unauthorized();

        var user = await authService.GetCurrentUserAsync(userId.Value, ct);
        if (user is null)
            return Results.Unauthorized();

        return Results.Ok(user);
    }

    private static void SetSessionCookie(HttpContext context, string cookie)
    {
        context.Response.Cookies.Append(AuthMiddleware.CookieName, cookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromDays(30),
            Path = "/"
        });
    }
}
