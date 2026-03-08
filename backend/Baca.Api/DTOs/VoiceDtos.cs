using Baca.Api.Models;

namespace Baca.Api.DTOs;

public class TranscriptionResult
{
    public required string Transcription { get; set; }
}

public class VoiceParseRequest
{
    public required string Transcription { get; set; }
}

public class VoiceParseResponse
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? AssigneeName { get; set; }
    public int? AssigneeId { get; set; }
    public double? AssigneeConfidence { get; set; }
    public string? CategoryName { get; set; }
    public int? CategoryId { get; set; }
    public double? CategoryConfidence { get; set; }
    public Priority? Priority { get; set; }
    public double? PriorityConfidence { get; set; }
    public string? DueDate { get; set; }
    public double? DueDateConfidence { get; set; }
    public TaskItemStatus Status { get; set; }
    public required string RawTranscription { get; set; }
}
