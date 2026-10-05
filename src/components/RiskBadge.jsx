export default function RiskBadge({ level, status }) {
  // If resolved, always show green regardless of risk level
  if (status === 'Resolved') {
    return (
      <span className="risk-badge low" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
        <span style={{ fontSize: 8 }}>●</span>
        Resolved ✓
      </span>
    );
  }
  const map = { high: 'High', medium: 'Medium', low: 'Low' };
  const dots = { high: '●', medium: '●', low: '●' };
  return (
    <span className={`risk-badge ${level}`}>
      <span style={{ fontSize: 8 }}>{dots[level]}</span>
      {map[level]}
    </span>
  );
}
