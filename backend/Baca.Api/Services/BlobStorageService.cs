using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Baca.Api.Services;

public interface IBlobStorageService
{
    Task<string> UploadAsync(string blobKey, Stream content, string contentType);
    Task<string?> GetSasUrlAsync(string blobKey);
    Task DeleteAsync(string blobKey);
}

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobContainerClient _container;
    private bool _containerEnsured;

    public BlobStorageService(IConfiguration config)
    {
        var connectionString = config["BlobStorage:ConnectionString"]
            ?? "UseDevelopmentStorage=true";
        var containerName = config["BlobStorage:ContainerName"]
            ?? "baca-images";

        _container = new BlobContainerClient(connectionString, containerName);
    }

    private async Task EnsureContainerAsync()
    {
        if (_containerEnsured) return;
        await _container.CreateIfNotExistsAsync(PublicAccessType.None);
        _containerEnsured = true;
    }

    public async Task<string> UploadAsync(string blobKey, Stream content, string contentType)
    {
        await EnsureContainerAsync();
        var blob = _container.GetBlobClient(blobKey);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });
        return blobKey;
    }

    public async Task<string?> GetSasUrlAsync(string blobKey)
    {
        var blob = _container.GetBlobClient(blobKey);
        if (!await blob.ExistsAsync()) return null;

        // Azurite (local dev) — return direct URL without SAS
        var host = _container.Uri.Host;
        if (host.Contains("127.0.0.1") || host.Contains("localhost"))
        {
            return blob.Uri.ToString();
        }

        // Production — generate 1-hour SAS token
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _container.Name,
            BlobName = blobKey,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.AddHours(1),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blob.GenerateSasUri(sasBuilder).ToString();
    }

    public async Task DeleteAsync(string blobKey)
    {
        var blob = _container.GetBlobClient(blobKey);
        await blob.DeleteIfExistsAsync();
    }
}
