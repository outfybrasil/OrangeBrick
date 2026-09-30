interface ReactionsErrorProps {
  message: string;
}

export function ReactionsError({ message }: ReactionsErrorProps) {
  if (!message) return null;

  return (
    <div className="px-4 pb-1">
      <p role="alert" className="break-words text-xs text-red-300">{message}</p>
    </div>
  );
}
