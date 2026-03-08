namespace Baca.Api.DTOs;

public class AppSettingsDto
{
    public required string GuestPin { get; set; }
    public required string AppName { get; set; }
}

public class UpdateSettingsRequest
{
    public string? GuestPin { get; set; }
    public string? AppName { get; set; }
}
