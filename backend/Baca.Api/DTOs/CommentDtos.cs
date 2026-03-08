namespace Baca.Api.DTOs;

public class CommentDto
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public int AuthorId { get; set; }
    public required string AuthorName { get; set; }
    public required string AuthorAvatarColor { get; set; }
    public required string Text { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCommentRequest
{
    public required string Text { get; set; }
}
