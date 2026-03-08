using Baca.Api.Data;
using Baca.Api.Models;
using Baca.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NSubstitute;

namespace Baca.Api.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly BacaDbContext _db;
    private readonly IEmailService _emailService;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<BacaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new BacaDbContext(options);
        _emailService = Substitute.For<IEmailService>();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Auth:Secret"] = "test-secret-min-32-chars-long-here-for-testing"
            })
            .Build();

        _sut = new AuthService(_db, _emailService, config);
    }

    [Fact]
    public async Task GenerateToken_StoresInDb_ReturnsTrue()
    {
        var user = new User { Name = "Test", Email = "test@example.com", Role = UserRole.User };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var result = await _sut.RequestMagicLinkAsync("test@example.com", CancellationToken.None);

        result.Should().BeTrue();
        var tokens = await _db.LoginTokens.ToListAsync();
        tokens.Should().HaveCount(1);
        tokens[0].UserId.Should().Be(user.Id);
        tokens[0].ExpiresAt.Should().BeAfter(DateTime.UtcNow);
        tokens[0].IsUsed.Should().BeFalse();

        await _emailService.Received(1)
            .SendMagicLinkAsync("test@example.com", "Test", Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RequestMagicLink_UnknownEmail_ReturnsFalse()
    {
        var result = await _sut.RequestMagicLinkAsync("unknown@example.com", CancellationToken.None);

        result.Should().BeFalse();
        await _emailService.DidNotReceive()
            .SendMagicLinkAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyToken_Valid_ReturnsUser_MarksTokenUsed()
    {
        var user = new User { Name = "Test", Email = "test@example.com", Role = UserRole.User };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = new LoginToken
        {
            UserId = user.Id,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
        _db.LoginTokens.Add(token);
        await _db.SaveChangesAsync();

        var result = await _sut.VerifyTokenAsync("valid-token", CancellationToken.None);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Test");
        result.Role.Should().Be(UserRole.User);

        var updatedToken = await _db.LoginTokens.FirstAsync(lt => lt.Token == "valid-token");
        updatedToken.IsUsed.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyToken_Expired_ReturnsNull()
    {
        var user = new User { Name = "Test", Email = "test@example.com", Role = UserRole.User };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = new LoginToken
        {
            UserId = user.Id,
            Token = "expired-token",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
        };
        _db.LoginTokens.Add(token);
        await _db.SaveChangesAsync();

        var result = await _sut.VerifyTokenAsync("expired-token", CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task VerifyToken_AlreadyUsed_ReturnsNull()
    {
        var user = new User { Name = "Test", Email = "test@example.com", Role = UserRole.User };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = new LoginToken
        {
            UserId = user.Id,
            Token = "used-token",
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IsUsed = true
        };
        _db.LoginTokens.Add(token);
        await _db.SaveChangesAsync();

        var result = await _sut.VerifyTokenAsync("used-token", CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task VerifyGuestPin_Correct_ReturnsGuest()
    {
        var hashedPin = BCrypt.Net.BCrypt.HashPassword("ovcina2026");
        _db.AppSettings.Add(new AppSettings { Id = 1, GuestPin = hashedPin });
        await _db.SaveChangesAsync();

        var result = await _sut.VerifyGuestPinAsync("ovcina2026", CancellationToken.None);

        result.Should().NotBeNull();
        result!.Role.Should().Be(UserRole.Guest);
        result.Name.Should().Be("Host");
    }

    [Fact]
    public async Task VerifyGuestPin_Wrong_ReturnsNull()
    {
        var hashedPin = BCrypt.Net.BCrypt.HashPassword("ovcina2026");
        _db.AppSettings.Add(new AppSettings { Id = 1, GuestPin = hashedPin });
        await _db.SaveChangesAsync();

        var result = await _sut.VerifyGuestPinAsync("wrongpin", CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task SessionCookie_RoundTrip_ReturnsUserId()
    {
        var cookie = await _sut.GenerateSessionCookieAsync(42, CancellationToken.None);

        var userId = await _sut.ValidateSessionCookieAsync(cookie, CancellationToken.None);

        userId.Should().Be(42);
    }

    [Fact]
    public async Task SessionCookie_Tampered_ReturnsNull()
    {
        var cookie = await _sut.GenerateSessionCookieAsync(42, CancellationToken.None);
        var tampered = cookie + "x";

        var userId = await _sut.ValidateSessionCookieAsync(tampered, CancellationToken.None);

        userId.Should().BeNull();
    }

    public void Dispose()
    {
        _db.Dispose();
        GC.SuppressFinalize(this);
    }
}
