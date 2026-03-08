using System.Text.Json.Serialization;

namespace Baca.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    Admin,
    User,
    Guest
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaskItemStatus
{
    Idea,
    Open,
    InProgress,
    ForReview,
    Done
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Priority
{
    Low,
    Medium,
    High
}
