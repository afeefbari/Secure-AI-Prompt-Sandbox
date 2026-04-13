const RISK_MAP = { Low: 0.2, Medium: 0.55, High: 0.9 };

/** Normalize risk from string "Low/Medium/High" or float 0-1 to float 0-1 */
export function toRiskFloat(risk) {
  if (typeof risk === 'number') return risk;
  return RISK_MAP[risk] ?? 0;
}

export function riskColor(risk) {
  const f = toRiskFloat(risk);
  return f >= 0.7 ? '#f87171' : f >= 0.4 ? '#fbbf24' : '#34d399';
}

export function riskLabel(risk) {
  if (typeof risk === 'string' && RISK_MAP[risk] !== undefined) return risk;
  const f = toRiskFloat(risk);
  return f >= 0.7 ? 'High' : f >= 0.4 ? 'Medium' : 'Low';
}
