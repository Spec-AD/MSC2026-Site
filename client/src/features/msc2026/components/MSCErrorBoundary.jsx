import { Component } from 'react';
import { recoverChunkLoad } from '../../../utils/recoverChunkLoad';

export default class MSCErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[MSC2026] interface crashed', error, info);
    recoverChunkLoad(error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#070910] px-6 text-white">
        <div className="w-full max-w-3xl border-l-4 border-red-400 bg-red-500/[0.06] p-8 md:p-12">
          <p className="font-mono text-base font-black text-red-300">MSC 2026 / RECOVERY MODE</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">比赛界面暂时无法显示</h1>
          <p className="mt-5 text-xl leading-relaxed text-zinc-300">
            比赛数据不会因显示故障被修改。请先重试当前页面；若问题持续，请由裁判返回赛事首页检查状态。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-red-300 px-6 py-4 text-xl font-black text-black"
            >
              重试当前页面
            </button>
            <a
              href="/matches/msc2026"
              className="border border-white/20 px-6 py-4 text-xl font-black text-zinc-100"
            >
              返回赛事首页
            </a>
          </div>
        </div>
      </div>
    );
  }
}
