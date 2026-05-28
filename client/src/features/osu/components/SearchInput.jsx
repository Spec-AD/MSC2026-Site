// ============================================================
// SearchInput — 通用热搜索输入框组件（b1.7.11）
// 0.2s debounce + 候选框 + 历史记录
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaSpinner, FaSearch, FaTimes } from 'react-icons/fa';

export default function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = '搜索…',
  debounceMs = 200,
  history = [],
  onClearHistory,
  renderCandidate,
  renderHistoryItem,
  loading = false,
  className = '',
}) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Debounce input
  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setLocalValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange?.(v);
    }, debounceMs);
  }, [onChange, debounceMs]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch?.(localValue);
    }
    if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const showDropdown = focused && (localValue || history.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-[#15151e]/80 border border-white/[0.08] rounded-lg px-3 py-2 focus-within:border-pink-500/40 transition-colors">
        <FaSearch className="text-zinc-500 text-xs shrink-0" />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        {loading && <FaSpinner className="animate-spin text-zinc-500 text-xs shrink-0" />}
        {localValue && !loading && (
          <button onClick={() => { setLocalValue(''); onChange?.(''); }} className="text-zinc-600 hover:text-zinc-400">
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#15151e] border border-white/[0.08] rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {/* History */}
          {!localValue && history.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">最近搜索</span>
                {onClearHistory && (
                  <button onClick={onClearHistory} className="text-[10px] text-zinc-600 hover:text-zinc-400">
                    清除
                  </button>
                )}
              </div>
              <div className="py-1">
                {history.map((item, i) => (
                  <div key={i} onClick={() => { setLocalValue(''); renderHistoryItem?.(item); }}>
                    {renderHistoryItem ? renderHistoryItem(item) : (
                      <div className="px-3 py-2 text-sm text-zinc-400 hover:bg-white/[0.03] cursor-pointer truncate">
                        {item}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidates */}
          {localValue && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <FaSpinner className="animate-spin text-zinc-600 text-lg" />
                </div>
              ) : renderCandidate ? (
                <div className="py-1">
                  {renderCandidate()}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-xs text-zinc-600">
                  输入关键词搜索
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
