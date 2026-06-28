'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '../../store/graphStore';
import { getGraphDataProvider } from '../../lib/graph-data';
import { NODE_TYPE_LABELS } from '../../lib/types';

export default function HoverTooltip() {
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!hoveredNodeId) return null;

  const provider = getGraphDataProvider();
  const node = provider.getNodeById(hoveredNodeId);
  if (!node) return null;

  let chainColor = '#E8E8F0';
  if (node.chains && node.chains.length > 1) chainColor = '#FFD700';
  else if (node.primary_chain === 'pv_chain') chainColor = '#FF8C00';
  else if (node.primary_chain === 'battery_chain') chainColor = '#3B82F6';

  const shortDef = node.definition ? (node.definition.length > 30 ? node.definition.slice(0, 30) + '...' : node.definition) : '';

  const tooltip = (
    <div
      className="fixed z-[100] pointer-events-none"
      style={{
        left: pos.x + 15,
        top: pos.y + 15,
        maxWidth: 280,
      }}
    >
      <div className="bg-black/80 backdrop-blur-md border border-white/15 rounded-lg px-3 py-2 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: chainColor }}
          />
          <span className="text-white text-sm font-semibold">{node.name}</span>
          <span className="text-white/40 text-xs">{NODE_TYPE_LABELS[node.node_type]}</span>
        </div>
        {shortDef && (
          <div className="text-white/60 text-xs leading-relaxed">{shortDef}</div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(tooltip, document.body);
}
