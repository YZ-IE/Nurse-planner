/**
 * Field — wrapper label + contrôle. Remplace s.label (monospace/uppercase abandonné).
 * Label : DM Sans 12px/600, T.muted.
 */

import { T, tk } from '../theme.js';

export default function Field({ label, hint, error, children, style = {} }) {
  return (
    <div style={{ marginBottom: tk.space.md, ...style }}>
      {label && (
        <div style={{
          color: error ? T.danger : T.muted,
          fontSize: tk.font.xs,
          fontWeight: tk.weight.semi,
          letterSpacing: 0.2,
          marginBottom: 6,
        }}>
          {label}
        </div>
      )}
      {children}
      {hint && !error && (
        <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 4, opacity: 0.8 }}>{hint}</div>
      )}
      {error && (
        <div style={{ color: T.danger, fontSize: tk.font.xs, fontWeight: tk.weight.semi, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}
