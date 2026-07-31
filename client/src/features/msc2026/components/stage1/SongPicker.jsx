// ============================================================
// SongPicker.jsx — 选手曲目选择面板
// ============================================================
import { useEffect, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { FaMusic, FaCheck, FaLock } from 'react-icons/fa';
import MotionButton from '../live/MotionButton';
import SongSelectionSpotlight from '../live/SongSelectionSpotlight';
import { MOTION_TRANSITIONS, STAGGER_CONTAINER, STAGGER_ITEM } from '../../utils/motion';
import { getSongCover } from '../../utils/songPresentation';

export default function SongPicker({ pool, excludedSongIds = [], pickType, onPick, disabled = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [spotlightSong, setSpotlightSong] = useState(null);
  const reduceMotion = useReducedMotion();

  const pickLabel =
    pickType === 'p1_pick' ? 'P1 选择自选曲' :
    pickType === 'p2_pick' ? 'P2 选择自选曲' :
    '选曲';

  useEffect(() => {
    setSelectedId(null);
    setConfirmed(false);
    setSpotlightSong(null);
  }, [pickType]);

  const getSongId = (song) => String(song?._id || song?.songId?._id || song?.songId || '');
  const excludedSet = new Set(excludedSongIds.map((id) => String(id?._id || id)));
  const availableSongs = pool.filter((s) => !excludedSet.has(getSongId(s)));
  const selectedSong = availableSongs.find((s) => getSongId(s) === selectedId);

  const handleSelect = (song) => {
    if (disabled) return;
    setSelectedId(getSongId(song));
    setSpotlightSong(song);
  };

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
    <Motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION_TRANSITIONS.enter}
      className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6"
    >
      <div className="flex items-end justify-between mb-5 gap-4">
        <h3 className="text-3xl font-black text-white" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
          {pickLabel}
        </h3>
        <span className="text-4xl font-black text-zinc-300 tabular-nums" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>{availableSongs.length}<span className="text-lg text-zinc-500 ml-2">首可选</span></span>
      </div>

      <AnimatePresence mode="wait">
        {confirmed ? (
          <Motion.div
            key="confirmed"
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.92, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={MOTION_TRANSITIONS.spring}
            className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-8 text-center overflow-hidden relative"
          >
            <Motion.div
              initial={reduceMotion ? false : { scale: 0.4, rotate: -24 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={MOTION_TRANSITIONS.spring}
            >
              <FaCheck className="text-4xl text-emerald-300 mx-auto mb-3" />
            </Motion.div>
            <p className="text-3xl text-emerald-200 font-black">选曲已确认</p>
            {selectedSong && <p className="text-xl text-zinc-300 mt-2">{selectedSong.title}</p>}
            {!reduceMotion && (
              <Motion.span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-1 bg-emerald-300"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </Motion.div>
        ) : (
          <Motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
          {/* 曲目列表 */}
          <Motion.div
            variants={reduceMotion ? undefined : STAGGER_CONTAINER}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1 mb-5"
          >
            {availableSongs.map((song) => {
              const id = getSongId(song);
              const isSelected = id === selectedId;
              return (
                <Motion.button
                  key={id}
                  onClick={() => handleSelect(song)}
                  disabled={disabled}
                  layout
                  variants={reduceMotion ? undefined : STAGGER_ITEM}
                  whileHover={!disabled && !reduceMotion ? { y: -2 } : undefined}
                  whileTap={!disabled && !reduceMotion ? { scale: 0.975 } : undefined}
                  transition={MOTION_TRANSITIONS.quick}
                  className={`
                    relative overflow-hidden flex min-h-[92px] items-center gap-4 p-4 rounded-lg text-left transition-colors border
                    ${isSelected
                      ? 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
                      : 'border-white/10 bg-black/15 hover:bg-white/[0.06]'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {getSongCover(song) && (
                    <img
                      src={getSongCover(song)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-[-12%] h-[124%] w-[124%] object-cover opacity-[0.18] blur-md saturate-75"
                    />
                  )}
                  <span aria-hidden="true" className="absolute inset-0 bg-black/60" />
                  {isSelected && (
                    <Motion.span
                      layoutId="msc-song-selection"
                      className="absolute inset-0 border-l-4 border-amber-300 bg-amber-400/[0.035] pointer-events-none"
                      transition={MOTION_TRANSITIONS.spring}
                    />
                  )}
                  {/* 封面缩略图 */}
                  {getSongCover(song) ? (
                    <img
                      src={getSongCover(song)}
                      alt={song.title}
                      className="relative z-10 h-16 w-16 flex-shrink-0 rounded object-cover border border-white/20 shadow-lg"
                    />
                  ) : (
                    <div className="relative z-10 w-16 h-16 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <FaMusic className="text-zinc-500 text-xl" />
                    </div>
                  )}
                  <div className="relative z-10 min-w-0 flex-1">
                    <p className="text-xl text-white font-bold truncate">{song.title}</p>
                    <p className="text-base text-zinc-500 truncate">{song.artist || song.basic_info?.artist}</p>
                    {/* 难度标签 */}
                    {(song.difficultyName || song.level) && (
                      <span className="inline-block text-sm px-2 py-0.5 mt-1 rounded bg-white/[0.06] text-zinc-300">
                        {song.difficultyName || 'MASTER'} · {song.chartConstant ?? song.levelValue ?? (Array.isArray(song.level) ? song.level[song.difficultyIndex ?? 3] : song.level)}
                      </span>
                    )}
                    {(song.bpm || song.basic_info?.bpm) && (
                      <span className="ml-2 inline-block text-sm font-mono text-amber-200/70">
                        BPM {song.bpm || song.basic_info?.bpm}
                      </span>
                    )}
                  </div>
                  {isSelected && <FaCheck className="relative z-10 text-amber-300 text-2xl flex-shrink-0" />}
                </Motion.button>
              );
            })}

            {availableSongs.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 text-2xl">
                <FaLock className="mx-auto mb-3 text-zinc-600 text-3xl" />
                无可选曲目
              </div>
            )}
          </Motion.div>

          {/* 确认按钮 */}
          <MotionButton
            onClick={handleConfirm}
            disabled={!selectedId || submitting || disabled}
            loading={submitting}
            className={`
              w-full py-4 rounded-xl font-black text-2xl transition-all
              ${selectedId && !submitting && !disabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 shadow-lg shadow-amber-500/5'
                : 'bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed'
              }
            `}
          >
            {submitting ? '提交中...' : '确认选曲'}
          </MotionButton>
          </Motion.div>
        )}
      </AnimatePresence>
      <SongSelectionSpotlight
        song={spotlightSong}
        pickLabel={pickLabel}
        onClose={() => setSpotlightSong(null)}
      />
    </Motion.section>
  );
}
