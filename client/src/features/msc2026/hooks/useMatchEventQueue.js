import { useCallback, useEffect, useRef, useState } from 'react';

const CUE_BUILDERS = {
  song_drawn: (data) => ({
    eyebrow: 'RANDOM SELECT',
    title: '随机曲目已锁定',
    detail: data.songTitle || '图池抽取完成',
    tone: 'amber',
    duration: 2400,
  }),
  item_collected: (data) => ({
    eyebrow: 'ITEM ACQUIRED',
    title: '道具已拾取',
    detail: data.itemName || '道具已加入选手背包',
    tone: 'cyan',
    duration: 1900,
  }),
  item_used: (data) => ({
    eyebrow: 'ITEM ACTIVATED',
    title: data.itemName || '道具已使用',
    detail: data.effect || '效果已经进入比赛流程',
    tone: 'cyan',
    duration: 2200,
  }),
  item_armed: (data) => ({
    eyebrow: 'ITEM READY',
    title: data.itemName || '道具效果已待命',
    detail: data.effect || '将在满足条件时自动结算',
    tone: 'cyan',
    duration: 1900,
  }),
  challenge_revealed: (data) => ({
    eyebrow: data.wallLabel || 'WALL CHALLENGE',
    title: data.taskName || '墙壁挑战开始',
    detail: [data.songTitle, data.difficulty].filter(Boolean).join(' · '),
    tone: 'amber',
    duration: 1800,
  }),
  challenge_resolved: (data) => ({
    eyebrow: 'CHALLENGE RESULT',
    title: data.passed ? '挑战成功' : '挑战失败',
    detail: data.passed ? '墙壁突破判定成立' : '选手返回当前层起点',
    tone: data.passed ? 'emerald' : 'red',
    duration: 1800,
  }),
  wall_broken: (data) => ({
    eyebrow: 'WALL BREAK',
    title: data.wallLabel || '墙壁突破',
    detail: '地图状态已更新',
    tone: 'emerald',
    duration: 1900,
  }),
  player_bounced: (data) => ({
    eyebrow: 'BOUNCE BACK',
    title: '突破失败，选手弹回',
    detail: data.wallLabel || '位置已更新',
    tone: 'red',
    duration: 1700,
  }),
  stage_advanced: (data) => ({
    eyebrow: 'STAGE TRANSITION',
    title: '比赛阶段推进',
    detail: ({ stage1: '12进6', stage2: '6进4', stage3: '4进2', stage4: '决赛', finished: '比赛结束' })[data.nextStage || data.to]
      || data.nextStage || data.to || '下一阶段已经就绪',
    tone: 'violet',
    duration: 2800,
  }),
  match_finished: (data) => ({
    eyebrow: data.type === 'final' ? 'FINAL RESULT' : 'GROUP RESULT',
    title: data.needTiebreak
      ? '等待加赛判定'
      : data.winnerName
        ? data.type === 'final' ? `${data.winnerName} 夺冠` : `${data.winnerName} 晋级`
        : data.type === 'final' ? '决赛结束' : '小组比赛结束',
    detail: data.needTiebreak
      ? '常规成绩完全相同'
      : data.nextGroupIndex != null ? `第 ${data.nextGroupIndex + 1} 组准备开始` : '比赛结果已经确认',
    tone: 'emerald',
    duration: 2600,
  }),
  map_timeout: () => ({
    eyebrow: 'TIME LIMIT',
    title: '跑图总时限结束',
    detail: '系统正在按当前排名结算',
    tone: 'red',
    duration: 2600,
  }),
};

export function useMatchEventQueue() {
  const [activeCue, setActiveCue] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const sequenceRef = useRef(0);
  const activeCueRef = useRef(null);
  const queueRef = useRef([]);

  const showNext = useCallback(() => {
    const nextCue = queueRef.current.shift() || null;
    activeCueRef.current = nextCue;
    setActiveCue(nextCue);
    setQueuedCount(queueRef.current.length);
  }, []);

  const enqueue = useCallback((eventName, data = {}) => {
    const buildCue = CUE_BUILDERS[eventName];
    if (!buildCue) return;
    const cue = {
      id: `${eventName}-${Date.now()}-${sequenceRef.current++}`,
      eventName,
      ...buildCue(data),
    };
    if (!activeCueRef.current) {
      activeCueRef.current = cue;
      setActiveCue(cue);
      return;
    }
    queueRef.current = [...queueRef.current, cue].slice(-12);
    setQueuedCount(queueRef.current.length);
  }, []);

  useEffect(() => {
    if (!activeCue) return undefined;
    const timer = setTimeout(showNext, activeCue.duration || 2000);
    return () => clearTimeout(timer);
  }, [activeCue, showNext]);

  const dismiss = useCallback(() => showNext(), [showNext]);

  return { activeCue, enqueue, dismiss, queuedCount };
}
