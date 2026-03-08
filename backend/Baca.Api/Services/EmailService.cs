using System.Net.Mail;

namespace Baca.Api.Services;

public partial class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendMagicLinkAsync(string email, string name, string token, CancellationToken ct)
    {
        var smtpHost = _config["Smtp:Host"] ?? "localhost";
        var smtpPort = int.Parse(_config["Smtp:Port"] ?? "1025", System.Globalization.CultureInfo.InvariantCulture);
        var fromEmail = _config["Smtp:FromEmail"] ?? "noreply@baca.local";
        var fromName = _config["Smtp:FromName"] ?? "Bača";
        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:3000";

        var link = $"{baseUrl}/auth/verify/{token}";

        using var client = new SmtpClient(smtpHost, smtpPort);
        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = "Přihlášení do Bača",
            Body = $"Ahoj {name},\n\nPro přihlášení klikni na: {link}\n\nOdkaz vyprší za 15 minut.\n\nBača",
            IsBodyHtml = false
        };
        message.To.Add(email);

        await client.SendMailAsync(message, ct);
        LogMagicLinkSent(email);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Magic link sent to {Email}")]
    private partial void LogMagicLinkSent(string email);
}
