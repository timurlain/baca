using Baca.Api.Models;
using Baca.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Baca.Api.Tests.Services;

public sealed class WhatsAppNotificationServiceTests
{
    [Fact(DisplayName = "NotifyAssigned_SendsMessage")]
    public async Task NotifyAssignedSendsMessage()
    {
        var fakeClient = new FakeTwilioWhatsAppClient();
        var logger = new ListLogger<WhatsAppNotificationService>();
        var service = CreateService(fakeClient, logger);

        await service.SendTaskAssignedAsync(CreateTask(), CreateAssignee(), CreateAssignedBy());
        var message = await fakeClient.WaitForSingleMessageAsync();

        message.To.Should().Be("whatsapp:+420123456789");
        message.From.Should().Be("whatsapp:+14155238886");
    }

    [Fact(DisplayName = "NotifyAssigned_NoPhone")]
    public async Task NotifyAssignedNoPhone()
    {
        var fakeClient = new FakeTwilioWhatsAppClient();
        var service = CreateService(fakeClient, new ListLogger<WhatsAppNotificationService>());

        await service.SendTaskAssignedAsync(
            CreateTask(),
            CreateAssignee(phone: null),
            CreateAssignedBy());

        fakeClient.Messages.Should().BeEmpty();
    }

    [Fact(DisplayName = "NotifyAssigned_SelfAssign")]
    public async Task NotifyAssignedSelfAssign()
    {
        var fakeClient = new FakeTwilioWhatsAppClient();
        var service = CreateService(fakeClient, new ListLogger<WhatsAppNotificationService>());
        var sameUser = CreateAssignee();

        await service.SendTaskAssignedAsync(CreateTask(), sameUser, sameUser);

        fakeClient.Messages.Should().BeEmpty();
    }

    [Fact(DisplayName = "NotifyAssigned_TwilioError")]
    public async Task NotifyAssignedTwilioError()
    {
        var fakeClient = new FakeTwilioWhatsAppClient { ExceptionToThrow = new InvalidOperationException("boom") };
        var logger = new ListLogger<WhatsAppNotificationService>();
        var service = CreateService(fakeClient, logger);

        var act = async () => await service.SendTaskAssignedAsync(CreateTask(), CreateAssignee(), CreateAssignedBy());

        await act.Should().NotThrowAsync();
        await fakeClient.WaitForAttemptAsync();
        var logEntry = await logger.WaitForLogAsync();
        logEntry.LogLevel.Should().Be(LogLevel.Error);
    }

    [Fact(DisplayName = "MessageFormat_ContainsAllFields")]
    public async Task MessageFormatContainsAllFields()
    {
        var fakeClient = new FakeTwilioWhatsAppClient();
        var service = CreateService(fakeClient, new ListLogger<WhatsAppNotificationService>());

        await service.SendTaskAssignedAsync(CreateTask(), CreateAssignee(), CreateAssignedBy());
        var message = await fakeClient.WaitForSingleMessageAsync();

        message.Body.Should().Contain("Připravit provazy");
        message.Body.Should().Contain("Logistika");
        message.Body.Should().Contain("Vysoká");
        message.Body.Should().Contain("12.03.2026");
        message.Body.Should().Contain("/board?task=42");
    }

    private static WhatsAppNotificationService CreateService(
        FakeTwilioWhatsAppClient fakeClient,
        ListLogger<WhatsAppNotificationService> logger)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Twilio:WhatsAppFrom"] = "+14155238886",
                    ["App:BaseUrl"] = "https://baca.local"
                })
            .Build();

        return new WhatsAppNotificationService(fakeClient, configuration, logger);
    }

    private static TaskItem CreateTask()
    {
        return new TaskItem
        {
            Id = 42,
            Title = "Připravit provazy",
            Status = TaskItemStatus.Open,
            Priority = Priority.High,
            Category = new Category
            {
                Id = 5,
                Name = "Logistika",
                Color = "#F59E0B"
            },
            CreatedById = 1,
            DueDate = new DateTime(2026, 3, 12, 0, 0, 0, DateTimeKind.Utc)
        };
    }

    private static User CreateAssignee(string? phone = "+420123456789")
    {
        return new User
        {
            Id = 2,
            Name = "Petr",
            Email = "petr@baca.local",
            Phone = phone,
            Role = UserRole.User
        };
    }

    private static User CreateAssignedBy()
    {
        return new User
        {
            Id = 1,
            Name = "Tomáš",
            Email = "tomas@baca.local",
            Role = UserRole.Admin
        };
    }

    private sealed class FakeTwilioWhatsAppClient : ITwilioWhatsAppClient
    {
        private readonly TaskCompletionSource<MessageRecord> _messageSource = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<bool> _attemptSource = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public List<MessageRecord> Messages { get; } = [];
        public Exception? ExceptionToThrow { get; set; }

        public Task SendMessageAsync(string from, string to, string body, CancellationToken ct = default)
        {
            _attemptSource.TrySetResult(true);

            if (ExceptionToThrow is not null)
            {
                throw ExceptionToThrow;
            }

            var message = new MessageRecord(from, to, body);
            Messages.Add(message);
            _messageSource.TrySetResult(message);
            return Task.CompletedTask;
        }

        public async Task<MessageRecord> WaitForSingleMessageAsync()
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            await using var _ = cts.Token.Register(() => _messageSource.TrySetCanceled(cts.Token));
            return await _messageSource.Task;
        }

        public async Task WaitForAttemptAsync()
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            await using var _ = cts.Token.Register(() => _attemptSource.TrySetCanceled(cts.Token));
            await _attemptSource.Task;
        }
    }

    private sealed class ListLogger<T> : ILogger<T>
    {
        private readonly TaskCompletionSource<LogEntry> _logSource = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public List<LogEntry> Messages { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull
        {
            return NullScope.Instance;
        }

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            var entry = new LogEntry(logLevel, formatter(state, exception), exception);
            Messages.Add(entry);
            _logSource.TrySetResult(entry);
        }

        public async Task<LogEntry> WaitForLogAsync()
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            await using var _ = cts.Token.Register(() => _logSource.TrySetCanceled(cts.Token));
            return await _logSource.Task;
        }
    }

    private sealed record MessageRecord(string From, string To, string Body);

    private sealed record LogEntry(LogLevel LogLevel, string Message, Exception? Exception);

    private sealed class NullScope : IDisposable
    {
        public static NullScope Instance { get; } = new();

        public void Dispose()
        {
        }
    }
}
