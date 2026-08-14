interface ReactionsErrorProps {
  message: string;
}

export function ReactionsError({ message }: ReactionsErrorProps) {
  if (!message) return null;

  return (
    <div className="px-4 pb-1">
      <p className="text-xs font-mono text-red-400">{message}</p>
    </div>
  );
}
