/**
 * Risk utility — converts any risk representation to a float 0.0–1.0.
 *
 * Handles three formats:
 *   - number    : already a float (0.85) — from new API
 *   - "Low/Medium/High" strings — from old audit log entries
 *   - "0.85" string — from audit log entries with new scorer
 */
const RISK_MAP = { Low: 0.2, Medium: 0.55, High: 0.9 };

/** Normalize any risk value to float 0.0–1.0 */
export function toRiskFloat(risk) {
  if (typeof risk === 'number') return risk;
  if (RISK_MAP[risk] !== undefined) return RISK_MAP[risk];
  const parsed = parseFloat(risk);
  if (!isNaN(parsed)) return parsed;
  return 0;
}

/** Returns a hex color for the risk value */
export function riskColor(risk) {
  const f = toRiskFloat(risk);
  if (f >= 0.70) return '#ef4444'; // Red   — High / Blocked
  if (f >= 0.40) return '#f59e0b'; // Amber — Medium / Flagged
  return '#10b981';                 // Green — Low / Allowed
}

/** Returns human-readable tier label */
export function riskLabel(risk) {
  if (typeof risk === 'string' && RISK_MAP[risk] !== undefined) return risk;
  const f = toRiskFloat(risk);
  if (f >= 0.70) return 'High';
  if (f >= 0.40) return 'Medium';
  return 'Low';
}

/** Returns a percentage string e.g. "85%" */
export function riskPercent(risk) {
  return `${(toRiskFloat(risk) * 100).toFixed(1)}%`;
}
