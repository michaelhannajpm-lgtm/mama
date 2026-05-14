import { C } from '../../theme';

export function SessionToolbar({ mode, onModeChange, lastReleaseTag, status, onNewSession, deployUrl }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      background: C.creamSoft, borderBottom: `1px solid ${C.divider}`,
      fontFamily: 'Albert Sans, sans-serif', fontSize: 13,
    }}>
      <button onClick={onNewSession} style={btn(C.terracotta)}>+ New session</button>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.inkSoft }}>
        <input type="checkbox" checked={mode === 'continue'} onChange={(e) => onModeChange(e.target.checked ? 'continue' : 'fresh')} />
        Continue thread (remember previous prompts)
      </label>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        {lastReleaseTag && <span style={{ color: C.saffron }}>{lastReleaseTag}</span>}
        {status && <span style={{ color: status === 'error' ? '#B23A48' : C.inkSoft }}>status: {status}</span>}
        {deployUrl && <a href={deployUrl} target="_blank" rel="noreferrer" style={{ color: C.sageDark }}>preview ↗</a>}
      </div>
    </div>
  );
}

const btn = (color) => ({
  background: color, color: 'white', border: 'none',
  padding: '6px 12px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
});
