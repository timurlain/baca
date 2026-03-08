using System.ComponentModel.DataAnnotations;

namespace Baca.Api.Models;

public class AppSettings
{
    public int Id { get; set; } = 1;

    [MaxLength(200)]
    public string GuestPin { get; set; } = string.Empty;

    [MaxLength(100)]
    public string AppName { get; set; } = "Bača";
}
