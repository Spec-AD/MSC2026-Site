// ============================================================
// SongSearchInput.jsx — 曲库搜索输入组件
// P5 | spec §十四 模式A — 模糊搜索 song 自动填写 constant/cover
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaMusic, FaSpinner } from 'react-icons/fa';
import { searchSongs } from '../../api/tournamentApi';

const SongSearchInput = ({
  value = '',
  onChange,
  onSelect,        // (song) => void — 选定后自动填充 constant/cover
  placeholder = '搜索曲目...',
  disabled = false,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(value);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // 同步外部 value
  useEffect(() => {
    if (value !== selectedTitle) {
      setSelectedTitle(value);
      setQuery(value);
    }
  }, [value]);

  // 搜索
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchSongs(q);
      setResults(res || []);
      setShowDropdown(res?.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const q = e.target.value;
    setQuery(q);
    onChange?.(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 250);
  }, [onChange, doSearch]);

  const handleSelect = useCallback((song) => {
    const title = song.title || song.name || '';
    setQuery(title);
    setSelectedTitle(title);
    setShowDropdown(false);
    onChange?.(title);
    onSelect?.(song);
  }, [onChange, onSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSelectedTitle('');
    setShowDropdown(false);
    onChange?.('');
  }, [onChange]);

  const handleBlur = useCallback(() => {
    // 延迟关闭让点击事件先触发
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (results.length > 0 && query.length > 0) {
      setShowDropdown(true);
    }
  }, [results, query]);

  return (
    <div className="relative">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full bg-black/50 border border-white/20 rounded-xl pl-9 pr-8 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600 disabled:opacity-50"
        />
        {loading && (
          <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin text-xs" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a26] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 max-h-64 overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-600">未找到匹配曲目</div>
            ) : (
              results.map((song, i) => {
                const title = song.title || '未知曲目';
                const artist = song.artist || '';
                const levelNames = Array.isArray(song.level) ? song.level : (song.level ? [song.level] : []);
                const ds = Array.isArray(song.ds) ? song.ds : (song.ds ? [song.ds] : []);
                const highestIdx = ds.length - 1;
                const topLevel = levelNames[highestIdx] || '';
                const topDs = ds[highestIdx] || 0;
                const cover = song.coverUrl || '';

                return (
                  <button
                    key={`${song.game || ''}_${song._id || i}`}
                    onClick={() => handleSelect(song)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] transition-colors text-left border-b border-white/[0.03] last:border-0"
                  >
                    {cover ? (
                      <img src={cover} alt="" className="w-8 h-8 rounded-lg object-cover bg-black flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <FaMusic className="text-cyan-400 text-[10px]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-bold truncate">{title}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{artist}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-zinc-400 font-bold">{topLevel}</div>
                      <div className="text-[10px] font-mono">
                        <span className="text-amber-400">Lv{topDs}</span>
                      </div>
                    </div>
                    <div className="text-[8px] text-zinc-600 uppercase ml-1">{song.game || ''}</div>
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SongSearchInput;
