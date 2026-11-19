import React from 'react';
import { Video, Download, Sparkles, Monitor, Smartphone, Square } from 'lucide-react';
import type { AspectRatio } from '../types/editor';

interface NavbarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  onExport: () => void;
  onLoadDemo: () => void;
  isExporting: boolean;
  hasClips: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectName,
  setProjectName,
  aspectRatio,
  setAspectRatio,
  onExport,
  onLoadDemo,
  isExporting,
  hasClips,
}) => {
  return (
    <header className="h-14 bg-[#14151a] border-b border-[#252733] px-4 flex items-center justify-between select-none z-30">
      {/* Left: Logo & Project Name */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-teal-400 to-cyan-500 text-black px-2.5 py-1.5 rounded-lg font-bold text-sm shadow-sm">
          <Video className="w-4 h-4 text-black fill-current" />
          <span className="tracking-wide">CapCut Web</span>
        </div>

        <div className="h-4 w-px bg-[#2f3140] mx-1" />

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent hover:bg-[#1d1f28] focus:bg-[#1d1f28] px-2 py-1 rounded text-sm font-medium text-gray-200 outline-none border border-transparent focus:border-teal-500/50 transition-colors max-w-[200px]"
          placeholder="Nama Proyek..."
        />
      </div>

      {/* Middle: Aspect Ratio presets */}
      <div className="flex items-center space-x-1 bg-[#1a1b23] p-1 rounded-lg border border-[#2b2d3d]">
        <button
          onClick={() => setAspectRatio('16:9')}
          title="Landscape (16:9) - YouTube / PC"
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
            aspectRatio === '16:9'
              ? 'bg-teal-500 text-black font-semibold shadow'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#252838]'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>16:9</span>
        </button>

        <button
          onClick={() => setAspectRatio('9:16')}
          title="Portrait (9:16) - TikTok / Reels / Shorts"
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
            aspectRatio === '9:16'
              ? 'bg-teal-500 text-black font-semibold shadow'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#252838]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>9:16</span>
        </button>

        <button
          onClick={() => setAspectRatio('1:1')}
          title="Square (1:1) - Instagram Feed"
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
            aspectRatio === '1:1'
              ? 'bg-teal-500 text-black font-semibold shadow'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#252838]'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span>1:1</span>
        </button>
      </div>

      {/* Right: Demo loader & Export */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onLoadDemo}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#222533] hover:bg-[#2d3144] text-teal-300 border border-teal-500/30 hover:border-teal-400 transition-all shadow-sm"
          title="Muat klip sampel untuk langsung mencoba seluruh fitur"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Muat Sampel Demo</span>
        </button>

        <button
          onClick={onExport}
          disabled={!hasClips || isExporting}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
            !hasClips || isExporting
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              : 'bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-black shadow-teal-500/20 active:scale-95'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Mengekspor...' : 'Ekspor Video'}</span>
        </button>
      </div>
    </header>
  );
};
