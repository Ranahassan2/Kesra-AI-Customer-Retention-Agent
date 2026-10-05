export function getHealthColor(score) {
  if (score < 30) return '#EF4444';
  if (score < 50) return '#F97316';
  if (score < 70) return '#F59E0B';
  if (score < 85) return '#10B981';
  return '#06B6D4';
}

export default function HealthBar({ score }) {
  const color = getHealthColor(score);
  return (
    <div className="health-bar-wrapper">
      <div className="health-bar-track">
        <div className="health-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="health-score-num" style={{ color }}>{score}</span>
    </div>
  );
}
