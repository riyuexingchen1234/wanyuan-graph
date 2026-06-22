'use client';

import { useState, useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onSearchFocus: () => void;
  onEscape: () => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  isGuiding?: boolean;
  isSearchOpen?: boolean;
}

export default function KeyboardShortcuts({
  onSearchFocus,
  onEscape,
  onPrevStep,
  onNextStep,
  isGuiding = false,
  isSearchOpen = false,
}: KeyboardShortcutsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onSearchFocus();
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }

      if (isGuiding) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onPrevStep?.();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNextStep?.();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchFocus, onEscape, onPrevStep, onNextStep, isGuiding, isSearchOpen]);

  if (isMobile) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20">
      <div className="bg-canvas-900/80 backdrop-blur rounded-arco-lg overflow-hidden">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full px-3 py-2 hover:bg-canvas-800 transition-colors"
        >
          <span className="text-arco-xs text-white/60">快捷键</span>
          <svg
            className={`w-4 h-4 text-white/40 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {!isCollapsed && (
          <div className="px-3 py-2 border-t border-canvas-700 space-y-1">
            <div className="flex items-center justify-between text-arco-xs">
              <span className="text-white/60">聚焦搜索</span>
              <kbd className="px-1.5 py-0.5 bg-canvas-700 rounded text-white/80">/</kbd>
            </div>
            <div className="flex items-center justify-between text-arco-xs">
              <span className="text-white/60">取消/关闭</span>
              <kbd className="px-1.5 py-0.5 bg-canvas-700 rounded text-white/80">Esc</kbd>
            </div>
            {isGuiding && (
              <>
                <div className="flex items-center justify-between text-arco-xs">
                  <span className="text-white/60">上一步</span>
                  <kbd className="px-1.5 py-0.5 bg-canvas-700 rounded text-white/80">←</kbd>
                </div>
                <div className="flex items-center justify-between text-arco-xs">
                  <span className="text-white/60">下一步</span>
                  <kbd className="px-1.5 py-0.5 bg-canvas-700 rounded text-white/80">→</kbd>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
