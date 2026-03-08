namespace Baca.Api.DTOs;

public record CategoryDto(
    int Id,
    string Name,
    string Color,
    int SortOrder,
    DateTime CreatedAt
);

public record CreateCategoryRequest(
    string Name,
    string Color
);

public record UpdateCategoryRequest(
    string? Name,
    string? Color,
    int? SortOrder
);
