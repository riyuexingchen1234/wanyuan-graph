'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, NodeType } from '@/lib/types';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/dal';

interface SearchBarProps {
  onNodeSelect: (id: string) => void;
  placeholder?: string;
}

/**
 * 搜索栏：通过 GET /api/graph?search= 走 DAL 检索，下拉显示带类型标签的匹配结果。
 * 不直接 import 种子 JSON。
 */
export default function SearchBar({ onNodeSelect, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GraphNode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(
        `/api/graph?search=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = (await res.json()) as GraphNode[];
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const getTypeBadgeStyle = (type: NodeType) => {
    const color = NODE_TYPE_COLORS[type] || '#86909C';
    return {
      backgroundColor: `${color}1A`,
      color,
      borderColor: `${color}4D`,
    };
  };

  return (
    <div ref={dropdownRef} className="relative z-40 w-full">
      <div
        className={`flex items-center bg-white/95 backdrop-blur rounded-arco-md border transition-all duration-200 ${
          isOpen
            ? 'shadow-arco-2 border-arco-primary'
            : 'shadow-arco-1 border-line-1'
        }`}
        style={{ height: '44px' }}
      >
        <svg
          className="w-5 h-5 text-ink-3 ml-3 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || '搜索材料、产品、设备、行业…'}
          className="flex-1 bg-transparent outline-none text-arco-sm text-ink-1 placeholder:text-ink-3 px-3"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="mr-2 text-ink-3 hover:text-ink-1"
            aria-label="清除"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && query.trim() && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-arco-md shadow-arco-3 border border-line-1 overflow-hidden z-50 max-h-[360px] overflow-y-auto">
          {results.slice(0, 10).map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors border-b border-line-1 last:border-b-0 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-arco-sm text-ink-1 font-medium truncate">
                    {result.name}
                  </span>
                  <span
                    className="px-1.5 py-0.5 text-xs border rounded-arco-sm flex-shrink-0"
                    style={getTypeBadgeStyle(result.node_type)}
                  >
                    {NODE_TYPE_LABELS[result.node_type] || result.node_type}
                  </span>
                </div>
                {result.definition && (
                  <div className="text-arco-xs text-ink-3 mt-1 line-clamp-1">
                    {result.definition}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-arco-md shadow-arco-3 border border-line-1 overflow-hidden z-50">
          <div className="px-4 py-6 text-center text-ink-3 text-sm">
            未找到相关节点
          </div>
        </div>
      )}
    </div>
  );
}
