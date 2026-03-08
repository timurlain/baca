namespace Baca.Api.DTOs;

public record DashboardDto(
    int TotalTasks,
    Dictionary<string, int> TasksByStatus,
    int OverdueTasks,
    double ProgressPercent,
    List<CategoryProgressDto> CategoryProgress,
    List<TaskDto> RecentTasks,
    int MyTaskCount
);

public record CategoryProgressDto(
    int CategoryId,
    string CategoryName,
    string CategoryColor,
    int TotalTasks,
    int DoneTasks,
    double ProgressPercent
);
