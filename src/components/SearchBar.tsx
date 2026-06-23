import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, NodeType } from '@/lib/types';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/cytoscape-config';

interface SearchBarProps {
  onNodeSelect: (id: string) => void;
}

interface SearchResult extends GraphNode {
  matchedBy?: 'name' | 'alias';
  matchedAlias?: string;
}

export default function SearchBar({ onNodeSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/graph/search?q=${encodeURIComponent(searchQuery)}`);
      const data: GraphNode[] = await response.json();
      // 标记匹配来源（名称 or 别名）
      const lowerQuery = searchQuery.toLowerCase();
      const enriched: SearchResult[] = data.map((node) => {
        const nameMatch = node.name.toLowerCase().includes(lowerQuery);
        if (nameMatch) {
          return { ...node, matchedBy: 'name' };
        }
        const matchedAlias = node.aliases?.find((a) =>
          a.toLowerCase().includes(lowerQuery)
        );
        return { ...node, matchedBy: 'alias', matchedAlias };
      });
      setResults(enriched);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchResults]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleInputFocus = () => {
    if (query.trim()) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const getTypeBadgeClass = (type: NodeType) => {
    const color = NODE_TYPE_COLORS[type] || '#86909C';
    return { backgroundColor: `${color}1A`, color, borderColor: `${color}4D` };
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-4 right-4 z-40"
      style={{ width: '300px' }}
    >
      <div className="relative">
        <div className={`
          flex items-center bg-white/95 backdrop-blur rounded-arco-md border
          transition-all duration-200
          ${isOpen ? 'shadow-arco-2 border-arco-primary' : 'shadow-arco-1 border-line-1'}
        `}
        style={{ height: '40px' }}
        >
          <svg
            className="w-4 h-4 text-ink-3 ml-3 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="搜索行业、产品、材料、设备…"
            className="flex-1 bg-transparent outline-none text-arco-sm text-ink-1 placeholder:text-ink-3 px-3"
          />
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-arco-md shadow-arco-3 border border-line-1 overflow-hidden">
            {results.slice(0, 10).map((result) => (
              <div
                key={result.id}
                onClick={() => handleSelect(result.id)}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-arco-sm text-ink-1 font-medium truncate">
                      {result.name}
                    </span>
                    <span
                      className="px-1.5 py-0.5 text-xs border rounded-arco-sm"
                      style={getTypeBadgeClass(result.type)}
                    >
                      {NODE_TYPE_LABELS[result.type] || result.type}
                    </span>
                  </div>
                  {result.matchedBy === 'alias' && result.matchedAlias && (
                    <div className="text-arco-xs text-ink-3 mt-0.5">
                      别名: {result.matchedAlias}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
