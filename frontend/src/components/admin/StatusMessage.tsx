export interface Message {
  text: string;
  type: 'success' | 'error';
}

export default function StatusMessage({ message }: { message: Message | null }) {
  if (!message) return null;
  return (
    <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
      {message.text}
    </p>
  );
}
