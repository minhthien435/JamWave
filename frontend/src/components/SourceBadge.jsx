export default function SourceBadge({ source, className = "" }) {
  if (source === "audius") {
    return (
      <span
        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30 flex-shrink-0 ${className}`}
      >
        Audius
      </span>
    );
  }
  return (
    <span
      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex-shrink-0 ${className}`}
    >
      Jamendo
    </span>
  );
}
