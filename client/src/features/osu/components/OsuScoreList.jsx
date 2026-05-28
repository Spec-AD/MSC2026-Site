// ============================================================
// OsuScoreList — 成绩列表（虚拟滚动）
// 封装 react-virtuoso，统一 BP 列表的渲染逻辑
// ============================================================

import { Virtuoso } from 'react-virtuoso';
import OsuScoreCard from './OsuScoreCard';

export default function OsuScoreList({ scores, onScoreClick, height = '70vh', emptyMessage }) {
  if (!scores || scores.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-600 font-medium bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
        {emptyMessage || '暂无成绩记录'}
      </div>
    );
  }

  return (
    <div className="bg-[#15151e]/40 rounded-xl border border-white/[0.05] overflow-hidden">
      <Virtuoso
        style={{ height, minHeight: 400 }}
        totalCount={scores.length}
        itemContent={(index) => (
          <OsuScoreCard
            score={scores[index]}
            rank={index + 1}
            onClick={onScoreClick}
          />
        )}
        overscan={5}
        components={{
          EmptyPlaceholder: () => null,
        }}
      />
    </div>
  );
}
