'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { getGraphDataProvider } from '../../lib/graph-data';
import { NODE_TYPE_LABELS } from '../../lib/types';
import type { GraphNode } from '../../lib/types';

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GraphNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyTo = useGraphStore((s) => s.flyTo);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const provider = getGraphDataProvider();
    const found = provider.searchNodes(q, undefined, 8);
    setResults(found);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  const handleSelect = useCallback((node: GraphNode) => {
    flyTo(node.id);
    closeSearch();
  }, [flyTo, closeSearch]);

  const handleResultClick = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelect(node);
  }, [handleSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !open) {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          closeSearch();
        } else {
          const state = useGraphStore.getState();
          state.resetView();
        }
      } else if (open && e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (open && e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (open && e.key === 'Enter') {
        e.preventDefault();
        const node = results[selectedIndex];
        if (node) handleSelect(node);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, openSearch, closeSearch, handleSelect]);

  const getChainColor = useCallback((node: GraphNode): string => {
    if (node.chains && node.chains.length > 1) return '#FFD700';
    if (node.primary_chain === 'pv_chain') return '#FF8C00';
    if (node.primary_chain === 'battery_chain') return '#3B82F6';
    return '#E8E8F0';
  }, []);

  return (
    <>
      {!open && (
        <button
          onClick={openSearch}
          className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur border border-white/15 rounded-full px-4 py-2 text-white/50 text-sm hover:bg-black/60 hover:border-white/30 hover:text-white/80 transition-all duration-200 z-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          搜索节点...
          <span className="ml-2 text-xs text-white/30 border border-white/20 rounded px-1.5 py-0.5">/</span>
        </button>
      )}
      {open && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[420px] max-w-[90vw]" style={{ pointerEvents: 'auto' }}>
          <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl" style={{ pointerEvents: 'auto' }}>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入节点名称搜索..."
                className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
                autoComplete="off"
                style={{ pointerEvents: 'auto' }}
              />
              <span className="text-xs text-white/30">ESC</span>
            </div>
            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto py-1" style={{ pointerEvents: 'auto' }}>
                {results.map((node, idx) => (
                  <button
                    key={node.id}
                    onMouseDown={(e) => handleResultClick(e, node)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors ${
                      idx === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getChainColor(node) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{node.name}</div>
                      <div className="text-white/40 text-xs truncate">
                        {NODE_TYPE_LABELS[node.node_type]}
                        {node.definition ? ` · ${node.definition.slice(0, 30)}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {query && results.length === 0 && (
              <div className="px-5 py-6 text-center text-white/30 text-sm">无匹配节点</div>
            )}
            {!query && (
              <div className="px-5 py-4 text-center text-white/20 text-xs">输入关键词搜索节点，↑↓选择，回车飞向</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
