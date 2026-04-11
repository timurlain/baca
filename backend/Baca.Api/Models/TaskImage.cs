using System.ComponentModel.DataAnnotations;

namespace Baca.Api.Models;

public class TaskImage
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    [Required]
    [MaxLength(500)]
    public required string BlobKey { get; set; }

    [Required]
    [MaxLength(200)]
    public required string FileName { get; set; }

    [Required]
    [MaxLength(50)]
    public required string ContentType { get; set; }

    public int UploadedById { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public TaskItem Task { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}
