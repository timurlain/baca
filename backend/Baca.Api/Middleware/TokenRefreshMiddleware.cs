using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Baca.Api.Middleware;

public partial class TokenRefreshMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TokenRefreshMiddleware> _logger;

    public TokenRefreshMiddleware(RequestDelegate next, ILogger<TokenRefreshMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var expiresAt = await context.GetTokenAsync("expires_at");
        if (expiresAt is not null && DateTimeOffset.TryParse(expiresAt, out var expiry))
        {
            // Refresh if token expires within 5 minutes
            if (expiry < DateTimeOffset.UtcNow.AddMinutes(5))
            {
                var refreshToken = await context.GetTokenAsync("refresh_token");
                if (refreshToken is not null)
                {
                    try
                    {
                        await RefreshTokensAsync(context, refreshToken);
                    }
                    catch (Exception ex)
                    {
                        LogTokenRefreshFailed(_logger, ex);
                    }
                }
            }
        }

        await _next(context);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Token refresh failed — user will need to re-authenticate")]
    private static partial void LogTokenRefreshFailed(ILogger logger, Exception ex);

    private static async Task RefreshTokensAsync(HttpContext context, string refreshToken)
    {
        var config = context.RequestServices.GetRequiredService<IConfiguration>();
        var authority = config["Oidc:Authority"];
        var clientId = config["Oidc:ClientId"];
        var clientSecret = config["Oidc:ClientSecret"];

        var httpFactory = context.RequestServices.GetRequiredService<IHttpClientFactory>();
        using var http = httpFactory.CreateClient("OidcTokenRefresh");
        var response = await http.PostAsync($"{authority}/connect/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken,
            ["client_id"] = clientId!,
            ["client_secret"] = clientSecret!,
        }));

        if (!response.IsSuccessStatusCode) return;

        var payload = await response.Content.ReadFromJsonAsync<TokenResponse>();
        if (payload is null) return;

        // Update stored tokens
        var authenticateResult = await context.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (authenticateResult.Properties is not null)
        {
            authenticateResult.Properties.UpdateTokenValue("access_token", payload.AccessToken);
            authenticateResult.Properties.UpdateTokenValue("refresh_token", payload.RefreshToken ?? refreshToken);
            authenticateResult.Properties.UpdateTokenValue("expires_at",
                DateTimeOffset.UtcNow.AddSeconds(payload.ExpiresIn).ToString("o"));

            await context.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                authenticateResult.Principal!,
                authenticateResult.Properties);
        }
    }

    private sealed record TokenResponse(
        [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string AccessToken,
        [property: System.Text.Json.Serialization.JsonPropertyName("refresh_token")] string? RefreshToken,
        [property: System.Text.Json.Serialization.JsonPropertyName("expires_in")] int ExpiresIn);
}
