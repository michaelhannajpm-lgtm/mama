import { useState } from 'react';
import { AC } from '../admin-theme';

// Description column for the Places / Events grids. Sits between the name block
// and the row action buttons. Collapsed it clamps to 2 lines; click (or
// Enter/Space) toggles the full text open/closed. `stopPropagation` keeps the
// click from bubbling to row handlers that open the edit modal.
export const DescriptionCell = ({ text }) => {
  const [open, setOpen] = useState(false);
  const body = (text || '').trim();

  const base = {
    flex: '1.6 1 0%',
    minWidth: 0,
    fontFamily: 'Albert Sans',
    fontSize: 11.5,
    lineHeight: 1.4,
  };

  if (!body) {
    return <div style={{ ...base, color: AC.textFaint, fontStyle: 'italic' }}>No description</div>;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      title={open ? 'Click to collapse' : 'Click to expand'}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
      }}
      style={{
        ...base,
        color: AC.textSoft,
        cursor: 'pointer',
        ...(open
          ? {}
          : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
      }}
    >
      {body}
    </div>
  );
};
