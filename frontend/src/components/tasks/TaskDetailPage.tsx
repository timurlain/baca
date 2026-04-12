import { useParams, useNavigate } from 'react-router-dom';
import TaskDetailModal from '../board/TaskDetailModal';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const taskId = Number(id);

  if (!taskId || isNaN(taskId)) {
    return (
      <div className="text-center py-20 text-gray-500">
        Neplatný úkol
      </div>
    );
  }

  return (
    <TaskDetailModal
      taskId={taskId}
      isOpen={true}
      onClose={() => navigate(-1)}
      onUpdate={() => {}}
    />
  );
}
