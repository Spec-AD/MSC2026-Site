import { Component } from 'react';
import { recoverChunkLoad } from '../utils/recoverChunkLoad';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[PureBeat] 页面渲染失败', error, info);
    recoverChunkLoad(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-[#06070b] px-6 text-zinc-100">
        <section className="w-full max-w-xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
          <p className="font-mono text-sm font-bold text-cyan-300">PUREBEAT / RECOVERY MODE</p>
          <h1 className="mt-4 text-3xl font-black">页面资源加载失败</h1>
          <p className="mt-4 leading-7 text-zinc-400">比赛数据不会受到影响。请检查网络后重试；系统会重新获取最新页面和比赛状态。</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-7 bg-cyan-300 px-6 py-3 font-black text-black">
            重新加载
          </button>
        </section>
      </main>
    );
  }
}
