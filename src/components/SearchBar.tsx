'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GraphNode, NodeType } from '@/lib/types';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/types';
import { getGraphDataProvider } from '@/lib/graph-data';

interface SearchBarProps {
  onNodeSelect: (id: string) => void;
  placeholder?: string;
}

interface SearchResult extends GraphNode {
  matchedBy?: 'name' | 'alias';
  matchedAlias?: string;
}

export default function SearchBar({ onNodeSelect, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allNodes = useMemo(() => {
    const provider = getGraphDataProvider();
    return provider.getGraphData().nodes;
  }, []);

  const loadSearchHistory = (): string[] => {
    try {
      const saved = localStorage.getItem('search-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveSearchHistory = (history: string[]) => {
    try {
      localStorage.setItem('search-history', JSON.stringify(history));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setSearchHistory(loadSearchHistory());
  }, []);

  const searchNodes = useCallback(
    (searchQuery: string): SearchResult[] => {
      if (!searchQuery.trim()) return [];

      const lowerQuery = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      for (const node of allNodes) {
        const nameMatch = node.name.toLowerCase().includes(lowerQuery);
        if (nameMatch) {
          results.push({ ...node, matchedBy: 'name' });
          continue;
        }
        const matchedAliasObj = node.aliases?.find((a) =>
          a.term.toLowerCase().includes(lowerQuery)
        );
        if (matchedAliasObj) {
          results.push({
            ...node,
            matchedBy: 'alias',
            matchedAlias: matchedAliasObj.term,
          });
        }
        if (results.length >= 10) break;
      }

      return results;
    },
    [allNodes]
  );

  const fetchResults = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        const data = searchNodes(searchQuery);
        setResults(data);

        const history = loadSearchHistory();
        const filtered = history.filter((h) => h !== searchQuery);
        const updated = [searchQuery, ...filtered].slice(0, 20);
        saveSearchHistory(updated);
        setSearchHistory(updated);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      }
    },
    [searchNodes]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchResults]);

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
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
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
    <div
      ref={dropdownRef}
      className="relative z-40"
      style={{ width: '100%' }}
    >
      <div className="relative">
        <div
          className={`
            flex items-center bg-white/95 backdrop-blur rounded-arco-md border
            transition-all duration-200
            ${isOpen
              ? 'shadow-arco-2 border-arco-primary'
              : 'shadow-arco-1 border-line-1'
            }
          `}
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
            onFocus={() => {
              setIsOpen(true);
            }}
            placeholder={placeholder || '搜索材料、产品、设备、行业…'}
            className="flex-1 bg-transparent outline-none text-arco-base text-ink-1 placeholder:text-ink-3 px-3"
          />
        </div>

        {isOpen && !query.trim() && searchHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-arco-md shadow-arco-3 border border-line-1 overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-2 border-b border-line-1">
              <span className="text-xs text-ink-3">搜索历史</span>
              <button
                onClick={() => {
                  saveSearchHistory([]);
                  setSearchHistory([]);
                }}
                className="text-xs text-ink-3 hover:text-ink-1 transition-colors"
              >
                清空
              </button>
            </div>
            <div className="p-2 flex flex-wrap gap-2">
              {searchHistory.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    fetchResults(term);
                  }}
                  className="px-2 py-1 text-xs bg-surface-1 text-ink-2 rounded hover:bg-surface-2 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-arco-md shadow-arco-3 border border-line-1 overflow-hidden z-50">
            {results.slice(0, 8).map((result) => (
              <div
                key={result.id}
                onClick={() => handleSelect(result.id)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 cursor-pointer transition-colors border-b border-line-1 last:border-b-0"
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
                    {result.stage === 'draft' && (
                      <span className="px-1.5 py-0.5 text-xs bg-ink-4/10 text-ink-3 rounded-arco-sm flex-shrink-0">
                        录入中
                      </span>
                    )}
                  </div>
                  {result.matchedBy === 'alias' && result.matchedAlias && (
                    <div className="text-arco-xs text-ink-3 mt-0.5">
                      别名: {result.matchedAlias}
                    </div>
                  )}
                  {result.definition && (
                    <div className="text-arco-xs text-ink-3 mt-1 line-clamp-1">
                      {result.definition}
                    </div>
                  )}
                </div>
              </div>
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
    </div>
  );
}
