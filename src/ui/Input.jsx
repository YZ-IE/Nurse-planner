/**
 * Input / Textarea — champs de saisie du kit UI.
 * size : md (48px) | compact (40px, lignes denses)
 */

import { T, tk } from '../theme.js';

function baseStyle(size) {
  const h = size === 'compact' ? tk.touch.compact : tk.touch.input;
  return {
    height: h,
    minHeight: h,
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: tk.radius.md,
    padding: '0 14px',
    color: T.text,
    fontSize: size === 'compact' ? tk.font.sm : tk.font.base,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };
}

export default function Input({ size = 'md', style = {}, ...props }) {
  return <input {...props} style={{ ...baseStyle(size), ...style }} />;
}

export function Textarea({ rows = 3, style = {}, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      style={{
        ...baseStyle('md'),
        height: 'auto',
        minHeight: 72,
        padding: '12px 14px',
        resize: 'vertical',
        lineHeight: 1.5,
        ...style,
      }}
    />
  );
}
