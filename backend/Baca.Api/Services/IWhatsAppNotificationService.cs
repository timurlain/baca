using Baca.Api.Models;

namespace Baca.Api.Services;

public interface IWhatsAppNotificationService
{
    Task SendTaskAssignedAsync(TaskItem task, User assignee, User assignedBy, CancellationToken ct = default);
}
