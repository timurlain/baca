namespace Baca.Api.DTOs;

public class TagDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Color { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateTagRequest
{
    public required string Name { get; set; }
    public string Color { get; set; } = "#3B82F6";
}

public class UpdateTagRequest
{
    public string? Name { get; set; }
    public string? Color { get; set; }
}
