import { Outlet } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import '../styles/industrialEditorial.css';

export default function MSC2026Layout() {
  return (
    <div className="preset-industrial-editorial msc-industrial">
      <span className="msc-edge-label">MSC26 / FINAL ARCHIVE / SEALED 2026.08</span>
      <header className="msc-industrial-header">
        <div className="relative mx-auto flex max-w-[1900px] items-end justify-between gap-5 overflow-hidden px-5 py-5 md:px-8">
          <div className="relative z-10">
            <p className="msc-kicker mb-3">PUREBEAT COMPETITION ARCHIVE / ISSUE 026</p>
            <div className="flex flex-wrap items-end gap-4">
              <h1 className="msc-industrial-title text-5xl md:text-7xl">MSC/2026</h1>
              <span className="mb-1 inline-flex items-center gap-2 border-l-2 border-amber-300 bg-amber-300/10 px-3 py-1 text-sm font-black text-amber-200 md:text-base">
                <LockKeyhole className="h-4 w-4" /> 已归档
              </span>
            </div>
          </div>
          <div className="msc-microgrid relative z-10 hidden md:grid">
            <span>MODE: READ ONLY</span><span>STATUS: FINAL</span><span>REV: 2026.08</span>
          </div>
          <span className="msc-industrial-anchor">26</span>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1900px] px-5 py-6 md:px-8 md:py-9">
        <Outlet />
      </main>
    </div>
  );
}
