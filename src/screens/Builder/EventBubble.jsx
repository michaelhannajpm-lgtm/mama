import { C } from '../../theme';

const KIND_LABEL = {
  prompt: 'You',
  log: 'log',
  file_edit: 'edit',
  commit: 'commit',
  tag: 'tag',
  deploy: 'deploy',
  status: 'status',
  done: 'done',
  error: 'error',
};

const KIND_COLOR = {
  prompt: C.terracotta,
  error: '#B23A48',
  done: C.sageDark,
  deploy: C.sageDark,
  commit: C.saffron,
  tag: C.saffron,
};

export function EventBubble({ event }) {
  const { kind, payload, ts } = event;
  const color = KIND_COLOR[kind] || C.inkSoft;
  const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const body = (() => {
    switch (kind) {
      case 'prompt':    return payload?.text || '';
      case 'log':       return payload?.line || JSON.stringify(payload);
      case 'file_edit': return payload?.path ? `edited ${payload.path}` : 'edited a file';
      case 'commit':    return `committed ${payload?.sha?.slice(0, 7) || ''} — ${payload?.message || ''}`;
      case 'tag':       return `tagged ${payload?.tag || ''}`;
      case 'deploy':    return payload?.url ? `deployed → ${payload.url}` : 'deploying…';
      case 'status':    return `status: ${payload?.stage || ''}`;
      case 'done':      return payload?.deployUrl ? `done — ${payload.deployUrl}` : 'done';
      case 'error':     return `error — ${payload?.detail || payload?.stage || ''}`;
      default:          return JSON.stringify(payload);
    }
  })();

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '6px 12px',
      fontFamily: 'Albert Sans, sans-serif', fontSize: 14,
      borderLeft: `3px solid ${color}`, marginBottom: 4, background: C.paper,
    }}>
      <span style={{ color: C.inkMuted, minWidth: 60, fontSize: 11 }}>{time}</span>
      <span style={{ color, minWidth: 56, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {KIND_LABEL[kind] || kind}
      </span>
      <span style={{ color: C.ink, flex: 1, whiteSpace: 'pre-wrap' }}>{body}</span>
    </div>
  );
}
