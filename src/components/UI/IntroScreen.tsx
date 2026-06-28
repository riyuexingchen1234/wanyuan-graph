'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wanyuan-intro-dismissed';

export default function IntroScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(5,8,16,0.85) 0%, rgba(5,8,16,0.97) 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: fading ? 'none' : 'auto',
      }}
      onClick={dismiss}
    >
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="text-center px-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.15) 0%, rgba(59,130,246,0.1) 50%, transparent 70%)' }}>
            <div className="w-12 h-12 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #FFD700, #FF8C00 40%, #3B82F6 100%)', boxShadow: '0 0 40px rgba(255,215,0,0.4), 0 0 80px rgba(255,140,0,0.2)' }} />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-wide" style={{ textShadow: '0 0 40px rgba(255,215,0,0.3)' }}>
          万源图谱
        </h1>
        <p className="text-lg text-white/60 mb-2 font-light tracking-widest">产业链的星海</p>
        <p className="text-sm text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
          点击任意星辰飞向它，发现产业链之间的联系
        </p>
        <button
          onClick={dismiss}
          className="px-8 py-3 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #FF8C00 0%, #FFD700 100%)',
            boxShadow: '0 0 30px rgba(255,140,0,0.4)',
          }}
        >
          开始探索
        </button>
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30">
          <span>滚轮缩放</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>拖拽旋转</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>点击节点飞向</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>按 / 搜索</span>
        </div>
      </div>
    </div>
  );
}
