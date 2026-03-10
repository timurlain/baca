using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Baca.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Endpoints;

public static class UserEndpoints
{
    private static readonly string[] AvatarPalette =
    [
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#EF4444",
        "#8B5CF6",
        "#06B6D4",
        "#EC4899",
        "#84CC16"
    ];

    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users");

        group.MapGet("/", GetUsersAsync);
        group.MapPost("/", CreateUserAsync);
        group.MapPut("/{id:int}", UpdateUserAsync);
        group.MapDelete("/{id:int}", DeleteUserAsync);
        group.MapPost("/{id:int}/resend-link", ResendLinkAsync);
    }

    private static async Task<IResult> GetUsersAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var users = await dbContext.Users
            .AsNoTracking()
            .Include(user => user.GameRole)
            .OrderBy(user => user.Name)
            .Select(user => new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Phone = user.Phone,
                Role = user.Role,
                GameRoleId = user.GameRoleId,
                GameRoleName = user.GameRole != null ? user.GameRole.Name : null,
                Shortcut = user.Shortcut,
                AvatarColor = user.AvatarColor,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            })
            .ToListAsync(ct);

        return TypedResults.Ok(users);
    }

    private static async Task<IResult> CreateUserAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        IEmailService emailService,
        TimeProvider timeProvider,
        CreateUserRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var validationError = await ValidateUserInputAsync(
            dbContext,
            request.Name,
            request.Email,
            request.Phone,
            request.Role,
            request.GameRoleId,
            userId: null,
            ct);
        if (validationError is not null)
        {
            return validationError;
        }

        var email = request.Email.Trim();
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            Phone = NormalizePhone(request.Phone),
            Role = request.Role,
            GameRoleId = request.GameRoleId,
            Shortcut = request.Shortcut?.Trim(),
            AvatarColor = GenerateAvatarColor(email)
        };

        var token = CreateLoginToken(timeProvider);
        user.LoginTokens.Add(token);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(ct);

        try
        {
            await emailService.SendMagicLinkAsync(email, user.Name, token.Token, ct);
        }
        catch
        {
            // User is already saved — don't fail the request if email sending fails.
            // Admin can resend the link later.
        }

        await dbContext.Entry(user)
            .Reference(createdUser => createdUser.GameRole)
            .LoadAsync(ct);

        return TypedResults.Created($"/api/users/{user.Id}", MapUser(user));
    }

    private static async Task<IResult> UpdateUserAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        UpdateUserRequest request,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var user = await dbContext.Users
            .Include(existingUser => existingUser.GameRole)
            .FirstOrDefaultAsync(existingUser => existingUser.Id == id, ct);
        if (user is null)
        {
            return Results.NotFound();
        }

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest("Jméno uživatele je povinné.");
            }

            user.Name = request.Name.Trim();
        }

        if (request.Phone is not null)
        {
            if (!IsValidPhone(request.Phone))
            {
                return Results.BadRequest("Telefon musí být ve formátu +420123456789.");
            }

            user.Phone = NormalizePhone(request.Phone);
        }

        if (request.Role.HasValue)
        {
            if (request.Role.Value == UserRole.Guest)
            {
                return Results.BadRequest("Guest účet nelze spravovat přes administraci.");
            }

            user.Role = request.Role.Value;
        }

        if (request.GameRoleId.HasValue)
        {
            var gameRoleExists = await dbContext.GameRoles
                .AnyAsync(gameRole => gameRole.Id == request.GameRoleId.Value, ct);
            if (!gameRoleExists)
            {
                return Results.BadRequest("Zvolená herní role neexistuje.");
            }
        }

        user.GameRoleId = request.GameRoleId;

        if (request.Shortcut is not null)
        {
            user.Shortcut = string.IsNullOrWhiteSpace(request.Shortcut) ? null : request.Shortcut.Trim();
        }

        if (request.IsActive.HasValue)
        {
            var currentUserId = EndpointIdentity.GetCurrentUserId(httpContext);
            if (request.IsActive.Value == false && currentUserId == id)
            {
                return Results.Conflict("Nelze deaktivovat vlastní účet.");
            }

            user.IsActive = request.IsActive.Value;
        }

        await dbContext.SaveChangesAsync(ct);
        await dbContext.Entry(user)
            .Reference(updatedUser => updatedUser.GameRole)
            .LoadAsync(ct);

        return TypedResults.Ok(MapUser(user));
    }

    private static async Task<IResult> DeleteUserAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        int id,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var currentUserId = EndpointIdentity.GetCurrentUserId(httpContext);
        if (currentUserId == id)
        {
            return Results.Conflict("Nelze smazat vlastní účet.");
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(existingUser => existingUser.Id == id, ct);
        if (user is null)
        {
            return Results.NotFound();
        }

        var hasTasks = await dbContext.TaskItems
            .AnyAsync(task => task.AssigneeId == id || task.CreatedById == id, ct);
        if (hasTasks)
        {
            return Results.Conflict("Uživatele s přiřazenými úkoly lze pouze deaktivovat.");
        }

        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.IsActive = false;
        await dbContext.SaveChangesAsync(ct);
        return Results.Ok();
    }

    private static async Task<IResult> ResendLinkAsync(
        HttpContext httpContext,
        BacaDbContext dbContext,
        IEmailService emailService,
        TimeProvider timeProvider,
        int id,
        CancellationToken ct)
    {
        if (!EndpointIdentity.IsAdmin(httpContext))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(existingUser => existingUser.Id == id, ct);
        if (user is null)
        {
            return Results.NotFound();
        }

        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return Results.BadRequest("Uživatel nemá e-mail pro magic link.");
        }

        var token = CreateLoginToken(timeProvider);
        dbContext.LoginTokens.Add(new LoginToken
        {
            UserId = user.Id,
            Token = token.Token,
            ExpiresAt = token.ExpiresAt,
            IsUsed = false
        });

        await dbContext.SaveChangesAsync(ct);
        await emailService.SendMagicLinkAsync(user.Email, user.Name, token.Token, ct);

        return Results.Ok();
    }

    private static async Task<IResult?> ValidateUserInputAsync(
        BacaDbContext dbContext,
        string name,
        string email,
        string? phone,
        UserRole role,
        int? gameRoleId,
        int? userId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Results.BadRequest("Jméno uživatele je povinné.");
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return Results.BadRequest("E-mail uživatele je povinný.");
        }

        if (role == UserRole.Guest)
        {
            return Results.BadRequest("Guest účet nelze spravovat přes administraci.");
        }

        if (!IsValidPhone(phone))
        {
            return Results.BadRequest("Telefon musí být ve formátu +420123456789.");
        }

        var normalizedEmail = email.Trim();
        var emailExists = await dbContext.Users
            .AnyAsync(
                user => user.Email != null
                    && (userId == null || user.Id != userId.Value)
                    && EF.Functions.ILike(user.Email, normalizedEmail),
                ct);
        if (emailExists)
        {
            return Results.Conflict("Uživatel se stejným e-mailem už existuje.");
        }

        if (gameRoleId.HasValue)
        {
            var gameRoleExists = await dbContext.GameRoles
                .AnyAsync(gameRole => gameRole.Id == gameRoleId.Value, ct);
            if (!gameRoleExists)
            {
                return Results.BadRequest("Zvolená herní role neexistuje.");
            }
        }

        return null;
    }

    private static LoginToken CreateLoginToken(TimeProvider timeProvider)
    {
        return new LoginToken
        {
            Token = Guid.NewGuid().ToString("D"),
            ExpiresAt = timeProvider.GetUtcNow().UtcDateTime.AddDays(7),
            IsUsed = false
        };
    }

    private static string GenerateAvatarColor(string seed)
    {
        var index = Math.Abs(StringComparer.OrdinalIgnoreCase.GetHashCode(seed)) % AvatarPalette.Length;
        return AvatarPalette[index];
    }

    private static string? NormalizePhone(string? phone)
    {
        return string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
    }

    private static bool IsValidPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return true;
        }

        var normalizedPhone = phone.Trim();
        return normalizedPhone.Length == 13
            && normalizedPhone.StartsWith("+420", StringComparison.Ordinal)
            && normalizedPhone.Skip(4).All(char.IsDigit);
    }

    private static UserDto MapUser(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            GameRoleId = user.GameRoleId,
            GameRoleName = user.GameRole?.Name,
            Shortcut = user.Shortcut,
            AvatarColor = user.AvatarColor,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }

}
