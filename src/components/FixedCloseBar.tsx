import React from 'react';
import { createPortal } from 'react-dom';

interface FixedCloseBarProps {
  label?: string;
  onClick: () => void;
  opacity?: number; // 0 ~ 1
}

const FixedCloseBar: React.FC<FixedCloseBarProps> = ({ label = '닫기', onClick, opacity = 0.85 }) => {
  const safeOpacity = Math.min(1, Math.max(0, opacity));

  const content = (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '8px 12px calc(env(safe-area-inset-bottom) + 8px)',
        backgroundColor: `rgba(255, 255, 255, ${safeOpacity})`,
        backdropFilter: 'saturate(180%) blur(8px)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.12)',
        zIndex: 100500, // ensure above any detail overlays
        display: 'flex',
        opacity: safeOpacity,
        justifyContent: 'center',
        pointerEvents: 'auto'
      }}
    >
      <button
        onClick={onClick}
        style={{
          padding: '8px 14px',
          borderRadius: '9999px',
          border: '1px solid #E5E7EB',
          backgroundColor: 'rgba(31, 41, 55, 0.9)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: 1,
          opacity: safeOpacity,
          display: 'inline-block',
          width: 'auto',
          minWidth: '64px',
          height: '32px',
          verticalAlign: 'middle',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
        }}
      >
        {label}
      </button>
    </div>
  );

  // Render as top-level overlay so it stays visible over all portals
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};

export default FixedCloseBar;


