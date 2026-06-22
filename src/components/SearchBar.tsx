import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode } from '@/lib/types';

interface SearchBarProps {
  onNodeSelect: (id: string) => void;
}

interface SearchResult extends GraphNode {
  matchedBy?: string;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  material: 'bg-success/10 text-success border-success/30',
  product: 'bg-arco-primary/10 text-arco-primary border-arco-primary/30',
  industry: 'bg-purple-100 text-purple-600 border-purple-300',
  equipment: 'bg-warning/10 text-warning border-warning/30',
  process: 'bg-cyan-100 text-cyan-600 border-cyan-300',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  material: '材料',
  product: '产品',
  industry: '行业',
  equipment: '设备',
  process: '工艺',
};

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
      const data = await response.json();
      setResults(data);
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

  const getCoordinateSystemMark = (coords: ('A' | 'B')[]) => {
    if (coords.includes('A') && coords.includes('B')) return 'AB';
    if (coords.includes('A')) return 'A';
    if (coords.includes('B')) return 'B';
    return '';
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
            placeholder="搜索行业、产品、材料…"
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
                    <span className={`
                      px-1.5 py-0.5 text-xs border rounded-arco-sm
                      ${NODE_TYPE_COLORS[result.node_type]}
                    `}>
                      {NODE_TYPE_LABELS[result.node_type]}
                    </span>
                    {result.coordinate_systems.length > 0 && (
                      <span className="text-arco-xs text-ink-3">
                        [{getCoordinateSystemMark(result.coordinate_systems)}]
                      </span>
                    )}
                  </div>
                  {result.matchedBy === 'alias' && result.aliases && result.aliases.length > 0 && (
                    <div className="text-arco-xs text-ink-3 mt-0.5">
                      别名: {result.aliases.map(a => a.term).join(', ')}
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