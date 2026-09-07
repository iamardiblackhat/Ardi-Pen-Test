export function RecordDescription({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g);
  return parts.map((part, index) => {
    const link = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (!link) return part;
    return (
      <a
        key={index}
        href={link[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-200 underline underline-offset-4"
      >
        {link[1]}
        <span className="sr-only"> (opens cited source in a new tab)</span>
      </a>
    );
  });
}
