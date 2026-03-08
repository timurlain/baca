using Baca.Api.DTOs;

namespace Baca.Api.Services;

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(int? currentUserId, CancellationToken ct = default);
}
