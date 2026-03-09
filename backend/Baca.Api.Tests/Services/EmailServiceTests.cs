using Baca.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace Baca.Api.Tests.Services;

public sealed class EmailServiceTests
{
    [Fact(DisplayName = "EmailService_Constructs_WithValidConfig")]
    public void EmailServiceConstructsWithValidConfig()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AzureCommunication:ConnectionString"] = "endpoint=https://test.communication.azure.com/;accesskey=dGVzdA==",
                ["AzureCommunication:SenderAddress"] = "DoNotReply@test.azurecomm.net",
                ["App:BaseUrl"] = "http://test.local:3000"
            })
            .Build();

        var logger = Substitute.For<ILogger<EmailService>>();
        var service = new EmailService(config, logger);

        service.Should().NotBeNull();
    }

    [Fact(DisplayName = "SendMagicLink_Throws_WhenConnectionStringMissing")]
    public async Task SendMagicLinkThrowsWhenConnectionStringMissing()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var logger = Substitute.For<ILogger<EmailService>>();
        var service = new EmailService(config, logger);

        var act = async () => await service.SendMagicLinkAsync(
            "test@example.com", "Test", "token123", CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ConnectionString*");
    }

    [Fact(DisplayName = "SendMagicLink_Throws_WithInvalidConnectionString")]
    public async Task SendMagicLinkThrowsWithInvalidConnectionString()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AzureCommunication:ConnectionString"] = "invalid-connection-string"
            })
            .Build();

        var logger = Substitute.For<ILogger<EmailService>>();
        var service = new EmailService(config, logger);

        var act = async () => await service.SendMagicLinkAsync(
            "test@example.com", "Test", "token123", CancellationToken.None);

        await act.Should().ThrowAsync<Exception>();
    }
}
