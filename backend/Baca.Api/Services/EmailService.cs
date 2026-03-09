using Azure;
using Azure.Communication.Email;

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
        var connectionString = _config["AzureCommunication:ConnectionString"]
            ?? throw new InvalidOperationException("AzureCommunication:ConnectionString not configured");
        var senderAddress = _config["AzureCommunication:SenderAddress"]
            ?? "DoNotReply@7feb2a55-415c-4bbc-8cda-99a62cfb5ae8.azurecomm.net";
        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:3000";

        var link = $"{baseUrl}/auth/verify/{token}";

        var client = new EmailClient(connectionString);

        var emailMessage = new EmailMessage(
            senderAddress: senderAddress,
            recipientAddress: email,
            content: new EmailContent("Přihlášení do Bača")
            {
                PlainText = $"Ahoj {name},\n\nPro přihlášení klikni na: {link}\n\nOdkaz vyprší za 15 minut.\n\nBača"
            });

        await client.SendAsync(WaitUntil.Started, emailMessage, ct);
        LogMagicLinkSent(email);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Magic link sent to {Email}")]
    private partial void LogMagicLinkSent(string email);
}
