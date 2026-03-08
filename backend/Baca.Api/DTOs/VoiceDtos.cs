using Baca.Api.Models;

namespace Baca.Api.DTOs;

public record VoiceParseResponse(
    string? Title,
    string? Description,
    string? AssigneeName,
    int? AssigneeId,
    double? AssigneeConfidence,
    string? CategoryName,
    int? CategoryId,
    double? CategoryConfidence,
    Priority? Priority,
    double? PriorityConfidence,
    string? DueDate,
    double? DueDateConfidence,
    TaskItemStatus Status,
    string RawTranscription
);
