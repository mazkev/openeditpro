import React from 'react';
import { Download, CheckCircle2, X, Loader2 } from 'lucide-react';
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
  if (!isOpen) return null;

  const isDone = progress.progress >= 100 && exportedBlob !== null;
  const downloadUrl = exportedBlob ? URL.createObjectURL(exportedBlob) : null;
  const fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_export.webm`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#171822] border border-[#2b2e40] rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-[#252838] transition-colors"
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
            <p className="text-xs text-gray-400 mb-6">
              Menggabungkan klip, memotong frame, menambahkan watermark, subtitle, dan narasi suara.
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

            <p className="text-[11px] text-gray-500">
              Jangan tutup jendela browser selama proses ekspor berlangsung.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-gray-100 mb-1">
              Video Berhasil Diekspor!
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Video Anda telah selesai dirangkai lengkap dengan potongan klip, subtitle, watermark, dan narasi suara.
            </p>

            {/* Download Button */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="w-full py-3 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-black font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all mb-3"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Video ({fileName})</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-200 underline mt-2"
            >
              Tutup & Kembali Mengedit
            </button>
          </>
        )}
      </div>
    </div>
  );
};
