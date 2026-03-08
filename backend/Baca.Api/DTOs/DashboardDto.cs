namespace Baca.Api.DTOs;

public class DashboardDto
{
    public int TotalTasks { get; set; }
    public Dictionary<string, int> TasksByStatus { get; set; } = [];
    public int OverdueTasks { get; set; }
    public double ProgressPercent { get; set; }
    public List<CategoryProgressDto> CategoryProgress { get; set; } = [];
    public List<TaskDto> RecentTasks { get; set; } = [];
    public int MyTaskCount { get; set; }
}

public class CategoryProgressDto
{
    public int CategoryId { get; set; }
    public required string CategoryName { get; set; }
    public required string CategoryColor { get; set; }
    public int TotalTasks { get; set; }
    public int DoneTasks { get; set; }
    public double ProgressPercent { get; set; }
}
