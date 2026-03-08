using System.Globalization;
using Baca.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Twilio.Clients;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Baca.Api.Services;

public interface ITwilioWhatsAppClient
{
    Task SendMessageAsync(string fromNumber, string recipientNumber, string body, CancellationToken ct = default);
}

public sealed class TwilioWhatsAppClient(IConfiguration configuration) : ITwilioWhatsAppClient
{
    public async Task SendMessageAsync(string fromNumber, string recipientNumber, string body, CancellationToken ct = default)
    {
        var accountSid = configuration["Twilio:AccountSid"]
            ?? configuration["Twilio__AccountSid"]
            ?? throw new InvalidOperationException("Twilio AccountSid není nastavený.");
        var authToken = configuration["Twilio:AuthToken"]
            ?? configuration["Twilio__AuthToken"]
            ?? throw new InvalidOperationException("Twilio AuthToken není nastavený.");

        var client = new TwilioRestClient(accountSid, authToken);
        await MessageResource.CreateAsync(
            to: new PhoneNumber(recipientNumber),
            from: new PhoneNumber(fromNumber),
            body: body,
            client: client);
    }
}

public sealed class WhatsAppNotificationService(
    ITwilioWhatsAppClient twilioClient,
    IConfiguration configuration,
    ILogger<WhatsAppNotificationService> logger) : IWhatsAppNotificationService
{
    private static readonly Action<ILogger, Exception?> MissingSenderLogger =
        LoggerMessage.Define(
            logLevel: LogLevel.Warning,
            eventId: new EventId(1, nameof(MissingSenderLogger)),
            formatString: "Twilio WhatsApp sender number is not configured.");

    private static readonly Action<ILogger, int, Exception?> SendFailedLogger =
        LoggerMessage.Define<int>(
            logLevel: LogLevel.Error,
            eventId: new EventId(2, nameof(SendFailedLogger)),
            formatString: "Failed to send WhatsApp notification for task {TaskId}");

    public Task SendTaskAssignedAsync(
        TaskItem task,
        User assignee,
        User assignedBy,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(assignee.Phone) || assignee.Id == assignedBy.Id)
        {
            return Task.CompletedTask;
        }

        var fromNumber = configuration["Twilio:WhatsAppFrom"] ?? configuration["Twilio__WhatsAppFrom"];
        if (string.IsNullOrWhiteSpace(fromNumber))
        {
            MissingSenderLogger(logger, null);
            return Task.CompletedTask;
        }

        var messageBody = BuildMessage(task, assignedBy);
        var toNumber = NormalizeWhatsAppNumber(assignee.Phone);
        var from = NormalizeWhatsAppNumber(fromNumber);

        _ = Task.Run(
            async () =>
            {
                try
                {
                    await twilioClient.SendMessageAsync(from, toNumber, messageBody, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    SendFailedLogger(logger, task.Id, ex);
                }
            },
            CancellationToken.None);

        return Task.CompletedTask;
    }

    internal string BuildMessage(TaskItem task, User assignedBy)
    {
        var baseUrl = (configuration["App:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
        var categoryName = task.Category?.Name ?? "Bez kategorie";
        var dueDate = task.DueDate?.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture) ?? "neurčen";

        return string.Join(
            Environment.NewLine,
            [
                "📋 *Nový úkol pro tebe*",
                string.Empty,
                $"*{task.Title}*",
                $"Kategorie: {categoryName}",
                $"Priorita: {DescribePriority(task.Priority)}",
                $"Termín: {dueDate}",
                string.Empty,
                $"Přiřadil: {assignedBy.Name}",
                string.Empty,
                $"🔗 {baseUrl}/board?task={task.Id}"
            ]);
    }

    private static string NormalizeWhatsAppNumber(string value)
    {
        var normalizedValue = value.Trim();
        return normalizedValue.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase)
            ? normalizedValue
            : $"whatsapp:{normalizedValue}";
    }

    private static string DescribePriority(Priority priority)
    {
        return priority switch
        {
            Priority.Low => "Nízká",
            Priority.High => "Vysoká",
            _ => "Střední"
        };
    }
}
