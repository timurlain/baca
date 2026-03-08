namespace Baca.Api.Services;

public interface IEmailService
{
    Task SendMagicLinkAsync(string email, string name, string token, CancellationToken ct = default);
}
