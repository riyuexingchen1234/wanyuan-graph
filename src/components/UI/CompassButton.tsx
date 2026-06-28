'use client';

import { useCallback } from 'react';
import { useGraphStore } from '../../store/graphStore';

export default function CompassButton() {
  const resetView = useGraphStore((s) => s.resetView);

  const handleClick = useCallback(() => {
    resetView();
  }, [resetView]);

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 hover:border-white/40 transition-all duration-200 z-50"
      title="返回全景 (ESC)"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
      </svg>
    </button>
  );
}
