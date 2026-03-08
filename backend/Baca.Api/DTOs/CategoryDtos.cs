namespace Baca.Api.DTOs;

public class CategoryDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Color { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCategoryRequest
{
    public required string Name { get; set; }
    public required string Color { get; set; }
}

public class UpdateCategoryRequest
{
    public string? Name { get; set; }
    public string? Color { get; set; }
    public int? SortOrder { get; set; }
}
