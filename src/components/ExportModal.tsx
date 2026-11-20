import React, { useState } from 'react';
import { Download, CheckCircle2, X, Loader2, Video, Globe, Sparkles } from 'lucide-react';
import type { ExportProgress } from '../utils/exportVideo';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress;
  exportedBlob: Blob | null;
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedBlob,
  projectName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'webm'>('mp4');

  if (!isOpen) return null;

  const isDone = progress.progress >= 100 && exportedBlob !== null;
  const cleanName = projectName.trim().toLowerCase().replace(/\s+/g, '_') || 'video';
  const fileSizeMb = exportedBlob ? (exportedBlob.size / (1024 * 1024)).toFixed(1) : '0';

  const handleDownload = (format: 'mp4' | 'webm') => {
    if (!exportedBlob) return;
    const fileName = `${cleanName}_export.${format}`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="bg-[#171822] border border-[#2b2e40] rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-[#252838] transition-colors"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!isDone ? (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-gray-100 mb-1">
              Sedang Mengekspor Video...
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Menggabungkan klip, merender subtitle presisi, watermark, dan memixing audio narasi & musik latar.
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[#101117] rounded-full h-3 mb-2 overflow-hidden border border-[#282b3d]">
              <div
                className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${progress.progress}%` }}
              />
            </div>

            <div className="w-full flex justify-between text-xs text-gray-400 font-mono mb-4">
              <span>{progress.status}</span>
              <span className="text-teal-400 font-bold">{progress.progress}%</span>
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-teal-300 bg-teal-950/40 border border-teal-500/30 px-3 py-1.5 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>Ukuran subtitle otomatis diskalakan 100% presisi sesuai preview</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-gray-100 mb-1">
              Video Berhasil Dirangkai!
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Video siap diunduh. Ukuran subtitle & tampilan teks telah disinkronkan 100% sesuai preview player.
            </p>

            {/* Format Selector Tabs */}
            <div className="w-full bg-[#101116] p-1.5 rounded-xl border border-[#262838] mb-4">
              <div className="text-[11px] text-gray-400 font-medium mb-1.5 flex justify-between px-1">
                <span>Pilih Format File Video:</span>
                <span className="text-gray-500 font-mono">{fileSizeMb} MB</span>
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
              className="w-full py-3 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-black font-extrabold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/25 active:scale-95 transition-all mb-2.5"
            >
              <Download className="w-4 h-4" />
              <span>
                Unduh Video {selectedFormat.toUpperCase()} ({cleanName}_export.{selectedFormat})
              </span>
            </button>

            {/* Alternative One-Click Download Option */}
            <div className="flex items-center space-x-2 w-full">
              {selectedFormat === 'mp4' ? (
                <button
                  onClick={() => handleDownload('webm')}
                  className="w-full py-1.5 bg-[#20222f] hover:bg-[#282a3c] text-gray-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2f3348] transition-colors"
                >
                  Atau Unduh sebagai .WEBM
                </button>
              ) : (
                <button
                  onClick={() => handleDownload('mp4')}
                  className="w-full py-1.5 bg-[#20222f] hover:bg-[#282a3c] text-teal-300 hover:text-teal-200 text-xs font-semibold rounded-lg border border-teal-500/30 transition-colors"
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
