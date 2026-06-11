// Copies a record's canonical admin deep-link to the clipboard. Always uses
// the immutable id form via recordPath(section, id). AC tokens only (admin
// design system) — never the phone-app C tokens.
import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { AC } from '../admin-theme';
import { recordPath } from '../lib/adminRouter';

export const CopyLinkButton = ({ section, id, size = 14, title = 'Copy link to this record' }) => {
  const [copied, setCopied] = useState(false);
  if (!id) return null;

  const url = `${window.location.origin}${recordPath(section, id)}`;

  const copy = async (e) => {
    e?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (non-HTTPS / permissions) — fall back to prompt so
      // the operator can still copy manually.
      try { window.prompt('Copy this link:', url); } catch { /* ignore */ }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const Icon = copied ? Check : Link2;
  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
        background: 'transparent', border: `1px solid ${AC.border}`,
        color: copied ? AC.success : AC.textMuted,
      }}
    >
      <Icon size={size} />
    </button>
  );
};
