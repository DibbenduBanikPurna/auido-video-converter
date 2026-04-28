export default function ProgressBar({ value }) {
  const clamped = Math.max(0, Math.min(100, value || 0));

  return (
    <div className="progress-wrapper" aria-label="Conversion progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="progress-text">{clamped}%</span>
    </div>
  );
}
