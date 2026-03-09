namespace Baca.Api.DTOs;

public class BulkParseRequest
{
    public required string Text { get; set; }
}

public class BulkParseResponse
{
    public List<VoiceParseResponse> Tasks { get; set; } = [];
}
