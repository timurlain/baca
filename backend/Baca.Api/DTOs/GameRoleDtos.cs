namespace Baca.Api.DTOs;

public class GameRoleDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Color { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateGameRoleRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Color { get; set; }
}

public class UpdateGameRoleRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public int? SortOrder { get; set; }
}
