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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
      <div className="flex items-end justify-between mb-5 gap-4">
        <h3 className="text-3xl font-black text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
          {pickLabel}
        </h3>
        <span className="text-4xl font-black text-zinc-300 tabular-nums" style={{ fontFamily: 'Torus, sans-serif' }}>{availableSongs.length}<span className="text-lg text-zinc-500 ml-2">首可选</span></span>
      </div>

      {confirmed ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-8 text-center"
        >
          <FaCheck className="text-4xl text-emerald-300 mx-auto mb-3" />
          <p className="text-3xl text-emerald-200 font-black">选曲已确认</p>
          {selectedSong && (
            <p className="text-xl text-zinc-400 mt-2">{selectedSong.title}</p>
          )}
        </motion.div>
      ) : (
        <>
          {/* 曲目列表 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1 mb-5">
            {availableSongs.map((song) => {
              const id = song._id || song.songId;
              const isSelected = id === selectedId;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(isSelected ? null : id)}
                  disabled={disabled}
                  className={`
                    flex items-center gap-4 p-4 rounded-2xl text-left transition-all border
                    ${isSelected
                      ? 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
                      : 'border-white/10 bg-black/15 hover:bg-white/[0.06]'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* 封面缩略图 */}
                  {song.coverUrl || song.jacketUrl ? (
                    <img
                      src={song.coverUrl || song.jacketUrl}
                      alt={song.title}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <FaMusic className="text-zinc-500 text-xl" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xl text-white font-bold truncate">{song.title}</p>
                    <p className="text-base text-zinc-500 truncate">{song.artist || song.basic_info?.artist}</p>
                    {/* 难度标签 */}
                    {song.level && (
                      <span className="inline-block text-sm px-2 py-0.5 mt-1 rounded bg-white/[0.06] text-zinc-400">
                        {Array.isArray(song.level) ? song.level[song.level.length - 1] : song.level}
                      </span>
                    )}
                  </div>
                  {isSelected && <FaCheck className="text-amber-300 text-2xl flex-shrink-0" />}
                </button>
              );
            })}

            {availableSongs.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 text-2xl">
                <FaLock className="mx-auto mb-3 text-zinc-600 text-3xl" />
                无可选曲目
              </div>
            )}
          </div>

          {/* 确认按钮 */}
          <button
            onClick={handleConfirm}
            disabled={!selectedId || submitting || disabled}
            className={`
              w-full py-4 rounded-xl font-black text-2xl transition-all
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
