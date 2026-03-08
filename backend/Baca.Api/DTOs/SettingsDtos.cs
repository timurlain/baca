namespace Baca.Api.DTOs;

public record AppSettingsDto(
    string GuestPin,
    string AppName
);

public record UpdateSettingsRequest(
    string? GuestPin,
    string? AppName
);
