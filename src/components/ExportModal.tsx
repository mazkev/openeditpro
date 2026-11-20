import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  X,
  Loader2,
  Video,
  Globe,
  Sparkles,
  Zap,
  Sliders,
  Check,
} from 'lucide-react';
import type { ExportProgress } from '../utils/exportVideo';
import type { AspectRatio, ExportConfig, ExportResolution, SharpenLevel } from '../types/editor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress;
  exportedBlob: Blob | null;
  projectName: string;
  isExporting: boolean;
  aspectRatio: AspectRatio;
  onStartExport: (config: ExportConfig) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedBlob,
  projectName,
  isExporting,
  aspectRatio,
  onStartExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'webm'>('mp4');
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [sharpen, setSharpen] = useState<boolean>(true);
  const [sharpenLevel, setSharpenLevel] = useState<SharpenLevel>('high');

  if (!isOpen) return null;

  const isDone = !isExporting && exportedBlob !== null && progress.progress >= 100;
  const isCurrentlyExporting = isExporting;
  const cleanName = projectName.trim().toLowerCase().replace(/\s+/g, '_') || 'video';
  const fileSizeMb = exportedBlob ? (exportedBlob.size / (1024 * 1024)).toFixed(1) : '0';

  const getDimensionText = (res: ExportResolution) => {
    if (res === '1080p') {
      if (aspectRatio === '9:16') return '1080 × 1920 (FHD 9:16)';
      if (aspectRatio === '1:1') return '1080 × 1080 (FHD 1:1)';
      return '1920 × 1080 (FHD 16:9)';
    } else {
      if (aspectRatio === '9:16') return '720 × 1280 (HD 9:16)';
      if (aspectRatio === '1:1') return '720 × 720 (HD 1:1)';
      return '1280 × 720 (HD 16:9)';
    }
  };

  const handleDownload = (format: 'mp4' | 'webm') => {
    if (!exportedBlob) return;
    const fileName = `${cleanName}_${resolution}.${format}`;
    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = new Blob([exportedBlob], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleTriggerExport = () => {
    onStartExport({
      resolution,
      sharpen,
      sharpenLevel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="bg-[#171822] border border-[#2b2e40] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col items-center text-center max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isCurrentlyExporting}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isCurrentlyExporting
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#252838]'
          }`}
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: CONFIGURATION BEFORE EXPORT */}
        {!isCurrentlyExporting && !isDone && (
          <div className="w-full flex flex-col items-center text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-3 shadow-sm">
              <Sliders className="w-6 h-6 text-teal-400" />
            </div>

            <h3 className="text-xl font-bold text-gray-100 mb-1 text-center w-full">
              Pengaturan Ekspor Video
            </h3>
            <p className="text-xs text-gray-400 mb-5 text-center w-full">
              Pilih resolusi dan aktifkan filter penajam gambar untuk hasil optimal.
            </p>

            {/* Resolution Selector Cards */}
            <div className="w-full mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Pilih Resolusi Video:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* 1080p Full HD Card */}
                <div
                  onClick={() => setResolution('1080p')}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all text-left relative flex flex-col justify-between ${
                    resolution === '1080p'
                      ? 'bg-teal-500/15 border-teal-400 shadow-md ring-1 ring-teal-500/50'
                      : 'bg-[#13141c] border-[#292c3e] hover:border-gray-500 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center space-x-1.5 font-bold text-sm text-gray-100">
                      <span>💎 1080p Full HD</span>
                    </span>
                    {resolution === '1080p' && (
                      <div className="w-4 h-4 rounded-full bg-teal-400 text-black flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-teal-300 font-medium mb-1">
                    {getDimensionText('1080p')}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Sangat jernih & tajam (~9 Mbps). Ideal untuk YouTube, TikTok & Reels.
                  </p>
                  <div className="mt-2 inline-block self-start text-[9px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Direkomendasikan
                  </div>
                </div>

                {/* 720p HD Card */}
                <div
                  onClick={() => setResolution('720p')}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all text-left relative flex flex-col justify-between ${
                    resolution === '720p'
                      ? 'bg-teal-500/15 border-teal-400 shadow-md ring-1 ring-teal-500/50'
                      : 'bg-[#13141c] border-[#292c3e] hover:border-gray-500 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center space-x-1.5 font-bold text-sm text-gray-100">
                      <span>⚡ 720p HD</span>
                    </span>
                    {resolution === '720p' && (
                      <div className="w-4 h-4 rounded-full bg-teal-400 text-black flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-teal-300 font-medium mb-1">
                    {getDimensionText('720p')}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Ukuran file lebih hemat (~4.5 Mbps), proses render lebih cepat.
                  </p>
                  <div className="mt-2 inline-block self-start text-[9px] font-bold px-2 py-0.5 rounded bg-gray-700/50 text-gray-300 border border-gray-600">
                    Standar Cepat
                  </div>
                </div>
              </div>
            </div>

            {/* Video Sharpening & HD Enhancer Card */}
            <div className="w-full bg-[#12131b] border border-[#2b2e42] p-3.5 rounded-xl mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-100 flex items-center space-x-1.5">
                      <span>Pertajam Video (Video Sharpening)</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-400/20 text-teal-300 uppercase">
                        AI Enhancer
                      </span>
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Sangat efektif untuk video bahan 360p / 480p yang buram/pecah
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setSharpen(!sharpen)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    sharpen ? 'bg-teal-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      sharpen ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {sharpen && (
                <div className="mt-3 pt-3 border-t border-[#26283b] flex items-center justify-between">
                  <span className="text-[11px] text-gray-300 font-medium">Tingkat Ketajaman:</span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setSharpenLevel('subtle')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        sharpenLevel === 'subtle'
                          ? 'bg-teal-500 text-black shadow'
                          : 'bg-[#1b1d28] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Sedang (Natural)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSharpenLevel('high')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        sharpenLevel === 'high'
                          ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-black font-extrabold shadow'
                          : 'bg-[#1b1d28] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Tinggi (Ultra Sharp)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Start Export Button */}
            <button
              onClick={handleTriggerExport}
              className="w-full py-3.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 hover:from-teal-300 hover:to-cyan-300 text-black font-extrabold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/25 active:scale-98 transition-all"
            >
              <Zap className="w-4 h-4 fill-current text-black" />
              <span>
                Mulai Render & Ekspor Video ({resolution.toUpperCase()})
              </span>
            </button>
          </div>
        )}

        {/* STEP 2: CURRENTLY EXPORTING */}
        {isCurrentlyExporting && (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-gray-100 mb-1">
              Sedang Mengekspor Video ({resolution.toUpperCase()})...
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {sharpen
                ? 'Menggabungkan klip, mempertajam kualitas frame (HD Enhancer), merender subtitle presisi, dan memixing audio.'
                : 'Menggabungkan klip, merender subtitle presisi, watermark, dan memixing audio narasi & musik latar.'}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <span className="text-[11px] font-mono bg-teal-950/60 border border-teal-500/40 text-teal-300 px-2.5 py-1 rounded-md">
                Resolusi: {getDimensionText(resolution)}
              </span>
              {sharpen && (
                <span className="text-[11px] flex items-center space-x-1 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-md">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Penajam: Aktif ({sharpenLevel === 'high' ? 'Ultra' : 'Natural'})</span>
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#101117] rounded-full h-3 mb-2 overflow-hidden border border-[#282b3d]">
              <div
                className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 h-full rounded-full transition-all duration-200"
                style={{ width: `${progress.progress}%` }}
              />
            </div>

            <div className="w-full flex justify-between text-xs text-gray-400 font-mono mb-4">
              <span className="truncate pr-2">{progress.status}</span>
              <span className="text-teal-400 font-bold">{progress.progress}%</span>
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-teal-300 bg-teal-950/40 border border-teal-500/30 px-3 py-1.5 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>Ukuran subtitle & watermark otomatis disinkronkan 100% presisi sesuai preview</span>
            </div>
          </>
        )}

        {/* STEP 3: EXPORT COMPLETED */}
        {isDone && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-gray-100 mb-1">
              Video Berhasil Dirangkai!
            </h3>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              Video siap diunduh dalam resolusi {resolution.toUpperCase()} ({getDimensionText(resolution)}).
            </p>

            {/* Sharpen / Resolution status pill */}
            <div className="flex items-center space-x-2 text-[11px] text-teal-300 bg-teal-950/40 border border-teal-500/30 px-3 py-1.5 rounded-lg mb-4">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>
                {sharpen
                  ? `Filter Penajam Video (${sharpenLevel === 'high' ? 'Ultra Sharp' : 'Natural'}) berhasil diterapkan!`
                  : `Terekspor bersih dalam ${resolution.toUpperCase()}`}
              </span>
            </div>

            {/* Format Selector Tabs */}
            <div className="w-full bg-[#101116] p-1.5 rounded-xl border border-[#262838] mb-4">
              <div className="text-[11px] text-gray-400 font-medium mb-1.5 flex justify-between px-1">
                <span>Pilih Format File Video:</span>
                <span className="text-gray-400 font-mono font-bold">{fileSizeMb} MB</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp4')}
                  className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                    selectedFormat === 'mp4'
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm font-bold ring-1 ring-teal-500/50'
                      : 'bg-[#161720] border-[#292c3c] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Video className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs truncate">Format MP4 (.mp4)</p>
                    <p className="text-[9px] text-teal-300/80 truncate">✨ Paling Populer (TikTok/IG/WA)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('webm')}
                  className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                    selectedFormat === 'webm'
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm font-bold ring-1 ring-teal-500/50'
                      : 'bg-[#161720] border-[#292c3c] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs truncate">Format WebM (.webm)</p>
                    <p className="text-[9px] text-gray-400 truncate">Ringan & Web Friendly</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Primary Download Button for Selected Format */}
            <button
              onClick={() => handleDownload(selectedFormat)}
              className="w-full py-3.5 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-black font-extrabold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/25 active:scale-95 transition-all mb-2.5"
            >
              <Download className="w-4 h-4 text-black" />
              <span>
                Unduh Video {selectedFormat.toUpperCase()} ({cleanName}_{resolution}.{selectedFormat})
              </span>
            </button>

            {/* Alternative One-Click Download Option */}
            <div className="flex items-center space-x-2 w-full">
              {selectedFormat === 'mp4' ? (
                <button
                  onClick={() => handleDownload('webm')}
                  className="w-full py-2 bg-[#20222f] hover:bg-[#282a3c] text-gray-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2f3348] transition-colors"
                >
                  Atau Unduh sebagai .WEBM
                </button>
              ) : (
                <button
                  onClick={() => handleDownload('mp4')}
                  className="w-full py-2 bg-[#20222f] hover:bg-[#282a3c] text-teal-300 hover:text-teal-200 text-xs font-semibold rounded-lg border border-teal-500/30 transition-colors"
                >
                  Atau Unduh sebagai .MP4
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-200 underline mt-3.5"
            >
              Tutup & Kembali Mengedit
            </button>
          </>
        )}
      </div>
    </div>
  );
};
