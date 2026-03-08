namespace Baca.Api.DTOs;

public record CommentDto(
    int Id,
    int TaskId,
    int AuthorId,
    string AuthorName,
    string AuthorAvatarColor,
    string Text,
    DateTime CreatedAt
);

public record CreateCommentRequest(
    string Text
);
