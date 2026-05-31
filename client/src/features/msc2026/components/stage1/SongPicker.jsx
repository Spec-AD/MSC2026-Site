// ============================================================
// SongPicker.jsx — 选手曲目选择面板
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMusic, FaCheck, FaLock } from 'react-icons/fa';

export default function SongPicker({ pool, excludedSongIds = [], pickType, onPick, disabled = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const pickLabel =
    pickType === 'p1_pick' ? 'P1 选择自选曲' :
    pickType === 'p2_pick' ? 'P2 选择自选曲' :
    '选曲';

  const excludedSet = new Set(excludedSongIds);
  const availableSongs = pool.filter((s) => !excludedSet.has(s._id || s.songId));
  const selectedSong = availableSongs.find((s) => (s._id || s.songId) === selectedId);

  const handleConfirm = async () => {
    if (!selectedId || submitting || disabled) return;
    setSubmitting(true);
    try {
      await onPick(selectedId);
      setConfirmed(true);
    } catch (err) {
      console.error('选曲失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
          {pickLabel}
        </h3>
        <span className="text-xs text-zinc-500">{availableSongs.length} 首可选</span>
      </div>

      {confirmed ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center"
        >
          <FaCheck className="text-2xl text-green-400 mx-auto mb-2" />
          <p className="text-sm text-green-300 font-medium">选曲已确认</p>
          {selectedSong && (
            <p className="text-xs text-zinc-500 mt-1">{selectedSong.title}</p>
          )}
        </motion.div>
      ) : (
        <>
          {/* 曲目列表 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1 mb-4">
            {availableSongs.map((song) => {
              const id = song._id || song.songId;
              const isSelected = id === selectedId;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(isSelected ? null : id)}
                  disabled={disabled}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl text-left transition-all
                    ${isSelected
                      ? 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
                      : 'border border-white/5 bg-zinc-800/40 hover:bg-zinc-800/60'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* 封面缩略图 */}
                  {song.coverUrl || song.jacketUrl ? (
                    <img
                      src={song.coverUrl || song.jacketUrl}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <FaMusic className="text-zinc-500 text-sm" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{song.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                    {/* 难度标签 */}
                    {song.level && (
                      <span className="inline-block text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-zinc-700/50 text-zinc-400">
                        {Array.isArray(song.level) ? song.level[song.level.length - 1] : song.level}
                      </span>
                    )}
                  </div>
                  {isSelected && <FaCheck className="text-amber-400 flex-shrink-0" />}
                </button>
              );
            })}

            {availableSongs.length === 0 && (
              <div className="col-span-full text-center py-8 text-zinc-500 text-sm">
                <FaLock className="mx-auto mb-2 text-zinc-600" />
                无可选曲目
              </div>
            )}
          </div>

          {/* 确认按钮 */}
          <button
            onClick={handleConfirm}
            disabled={!selectedId || submitting || disabled}
            className={`
              w-full py-3 rounded-xl font-medium text-sm transition-all
              ${selectedId && !submitting && !disabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 shadow-lg shadow-amber-500/5'
                : 'bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed'
              }
            `}
          >
            {submitting ? '提交中...' : '确认选曲'}
          </button>
        </>
      )}
    </div>
  );
}
