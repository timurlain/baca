using System.Security.Claims;
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
        // 1. HttpContext.Items (populated by the claims-to-items middleware)
        if (httpContext.Items.TryGetValue("Role", out var roleValue) && roleValue is UserRole itemRole)
        {
            return itemRole;
        }

        // 2. Claims (direct OIDC path)
        var claimRole = httpContext.User.FindFirstValue("local_user_role");
        if (claimRole is not null && Enum.TryParse<UserRole>(claimRole, out var parsedRole))
        {
            return parsedRole;
        }

        // 3. Testing headers
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
        // 1. HttpContext.Items (populated by the claims-to-items middleware)
        if (httpContext.Items.TryGetValue("UserId", out var userIdValue) && userIdValue is int itemUserId)
        {
            return itemUserId;
        }

        // 2. Claims (direct OIDC path)
        var claimUserId = httpContext.User.FindFirstValue("local_user_id");
        if (claimUserId is not null && int.TryParse(claimUserId, out var parsedUserId))
        {
            return parsedUserId;
        }

        // 3. Testing headers
        return GetCurrentUserIdFromTestingHeader(httpContext);
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
