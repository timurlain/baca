using Baca.Api.DTOs;
using Baca.Api.Models;
using Baca.Api.Services;

namespace Baca.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this WebApplication app)
    {
        app.MapGet("/api/dashboard", GetDashboardAsync);
    }

    private static async Task<IResult> GetDashboardAsync(
        HttpContext httpContext,
        IDashboardService dashboardService,
        CancellationToken ct)
    {
        var currentUserId = EndpointIdentity.GetCurrentUserId(httpContext);
        var dashboard = await dashboardService.GetDashboardAsync(currentUserId, ct);
        return TypedResults.Ok(dashboard);
    }
}

internal static class EndpointIdentity
{
    private const string TestRoleHeader = "X-Test-Role";
    private const string TestUserIdHeader = "X-Test-User-Id";

    public static UserRole GetCurrentRole(HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue("Role", out var roleValue))
        {
            return roleValue switch
            {
                UserRole role => role,
                string roleText when Enum.TryParse<UserRole>(roleText, true, out var parsedRole) => parsedRole,
                AuthResponse authResponse => authResponse.Role,
                User user => user.Role,
                _ => UserRole.Guest
            };
        }

        if (httpContext.Items.TryGetValue("User", out var userValue))
        {
            return userValue switch
            {
                AuthResponse authResponse => authResponse.Role,
                User user => user.Role,
                _ => UserRole.Guest
            };
        }

        if (IsTestingEnvironment(httpContext)
            && httpContext.Request.Headers.TryGetValue(TestRoleHeader, out var roleHeader)
            && Enum.TryParse<UserRole>(roleHeader.ToString(), true, out var testRole))
        {
            return testRole;
        }

        return UserRole.Guest;
    }

    public static int? GetCurrentUserId(HttpContext httpContext)
    {
        if (!httpContext.Items.TryGetValue("User", out var userValue))
        {
            return GetCurrentUserIdFromTestingHeader(httpContext);
        }

        return userValue switch
        {
            int userId => userId,
            AuthResponse authResponse => authResponse.Id,
            User user => user.Id,
            _ => null
        };
    }

    public static bool IsAdmin(HttpContext httpContext)
    {
        return GetCurrentRole(httpContext) == UserRole.Admin;
    }

    public static bool IsMember(HttpContext httpContext)
    {
        var role = GetCurrentRole(httpContext);
        return role is UserRole.Admin or UserRole.User;
    }

    private static bool IsTestingEnvironment(HttpContext httpContext)
    {
        var environment = httpContext.RequestServices.GetService<IHostEnvironment>();
        return environment?.IsEnvironment("Testing") == true;
    }

    private static int? GetCurrentUserIdFromTestingHeader(HttpContext httpContext)
    {
        return IsTestingEnvironment(httpContext)
            && httpContext.Request.Headers.TryGetValue(TestUserIdHeader, out var userHeader)
            && int.TryParse(userHeader.ToString(), out var userId)
                ? userId
                : null;
    }
}
