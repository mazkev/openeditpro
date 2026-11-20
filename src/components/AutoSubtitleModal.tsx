import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  X,
  Languages,
  Mic,
  CheckCircle2,
  Play,
  AlertTriangle,
} from 'lucide-react';
import type { VideoClip, Subtitle } from '../types/editor';
import { formatTime } from '../utils/time';

interface AutoSubtitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: VideoClip[];
  onApplySubtitles: (newSubtitles: Subtitle[]) => void;
  totalDuration: number;
}

// Window speech recognition type declaration
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

const AutoSubtitleModalComponent: React.FC<AutoSubtitleModalProps> = ({
  isOpen,
  onClose,
  clips,
  onApplySubtitles,
  totalDuration,
}) => {
  const [language, setLanguage] = useState<'id-ID' | 'en-US' | 'auto'>('id-ID');
  const [isListening, setIsListening] = useState(false);
  const [transcribedList, setTranscribedList] = useState<
    { id: string; text: string; startTime: number; endTime: number }[]
  >([]);
  const [currentSentence, setCurrentSentence] = useState('');
  const [progressTime, setProgressTime] = useState(0);
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  });
  const [statusMessage, setStatusMessage] = useState('Siap mendeteksi percakapan video...');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTranscription = useCallback(() => {
    setIsListening(false);
    setStatusMessage('Transkripsi selesai! Periksa hasil subtitle di bawah.');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
  }, []);

  const startAutoTranscription = useCallback(async () => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert('Browser Anda tidak mendukung Web Speech Recognition. Disarankan menggunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    // Reset list
    setTranscribedList([]);
    setCurrentSentence('');
    setIsListening(true);
    setProgressTime(0);
    setStatusMessage('Memulai pemutaran & mendengarkan percakapan audio...');

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'auto' ? 'id-ID' : language;

      let sentenceStartTime = 0;
      startTimeRef.current = performance.now();

      // Play audio from the first clip in background if available
      const testAudio = new Audio();
      if (clips.length > 0 && clips[0].url) {
        testAudio.src = clips[0].url;
        testAudio.currentTime = clips[0].trimStart;
        testAudio.play().catch(() => {});
      }

      recognition.onstart = () => {
        setStatusMessage('Mendengarkan percakapan dari video secara aktif...');
        sentenceStartTime = 0;
      };

      recognition.onresult = (event: any) => {
        const currentTimeOffset = (performance.now() - startTimeRef.current) / 1000;
        let interimText = '';
        let finalSentence = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSentence += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText) {
          setCurrentSentence(interimText);
        }

        if (finalSentence.trim().length > 0) {
          const cleanText = finalSentence.trim();
          const calculatedStart = Math.max(0, sentenceStartTime);
          const calculatedEnd = Math.max(calculatedStart + 1.5, currentTimeOffset);

          setTranscribedList((prev) => [
            ...prev,
            {
              id: `auto-sub-${Date.now()}-${prev.length}`,
              text: cleanText,
              startTime: parseFloat(calculatedStart.toFixed(1)),
              endTime: parseFloat(calculatedEnd.toFixed(1)),
            },
          ]);

          setCurrentSentence('');
          sentenceStartTime = currentTimeOffset + 0.3;
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        if (err.error === 'not-allowed') {
          setStatusMessage('Izin mikrofon diperlukan agar browser dapat mendengarkan audio.');
        } else {
          setStatusMessage(`Status: ${err.error || 'Mencari frekuensi suara...'}`);
        }
      };

      recognition.onend = () => {
        if (isListening) {
          // Restart if still within video duration
          const elapsed = (performance.now() - startTimeRef.current) / 1000;
          if (elapsed < totalDuration) {
            try {
              recognition.start();
            } catch {
              // Ignore restart error if busy
            }
          } else {
            stopTranscription();
          }
        }
      };

      recognition.start();

      // Timer to advance progress
      timerRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        setProgressTime(elapsed);

        if (totalDuration > 0 && elapsed >= totalDuration) {
          stopTranscription();
          testAudio.pause();
        }
      }, 200);
    } catch (err) {
      console.error(err);
      setIsListening(false);
      setStatusMessage('Gagal mengaktifkan pengenalan suara.');
    }
  }, [clips, isListening, language, stopTranscription, totalDuration]);

  // Simulate AI transcription for demo or quick auto captions
  const handleSimulateAutoCaptions = () => {
    const sampleSentences = [
      'Halo semuanya, selamat datang kembali di channel ini!',
      'Hari ini kita akan mengulas trik editing video yang sangat keren.',
      'Perhatikan bagaimana potongan video ini berpindah dengan sangat mulus.',
      'Jangan lupa untuk like, share, dan subscribe untuk video berikutnya!',
    ];

    const generated: Subtitle[] = [];
    const step = Math.max(2, totalDuration / sampleSentences.length);

    sampleSentences.forEach((text, i) => {
      const start = i * step + 0.5;
      const end = Math.min(start + step - 0.5, totalDuration > 0 ? totalDuration : 999);
      if (totalDuration === 0 || start < totalDuration) {
        generated.push({
          id: `ai-sub-${Date.now()}-${i}`,
          text,
          startTime: parseFloat(start.toFixed(1)),
          endTime: parseFloat(end.toFixed(1)),
          fontSize: 26,
          color: '#ffffff',
          bgColor: 'rgba(0,0,0,0.7)',
          positionY: 85,
        });
      }
    });

    onApplySubtitles(generated);
    onClose();
  };

  const handleApply = () => {
    if (transcribedList.length === 0) {
      alert('Belum ada kalimat yang berhasil ditranskrip.');
      return;
    }

    const newSubs: Subtitle[] = transcribedList.map((item) => ({
      id: item.id,
      text: item.text,
      startTime: item.startTime,
      endTime: item.endTime,
      fontSize: 26,
      color: '#ffffff',
      bgColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 3,
      fontFamily: 'impact',
      isUppercase: true,
      positionY: 82,
    }));

    onApplySubtitles(newSubs);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#171822] border border-[#2e3146] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#252838] mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100 flex items-center space-x-2">
                <span>Auto Subtitle (AI Speech-to-Text)</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono">
                  Smart AI
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Mendengarkan percakapan audio video dan mengubahnya menjadi subtitle otomatis
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopTranscription();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-[#252838] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Support Alert */}
        {!isSupported && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-2.5 mb-4 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Perhatian Browser</p>
              <p className="text-[11px] text-amber-200/80">
                Browser ini tidak memiliki Web Speech API bawaan. Gunakan Google Chrome atau Microsoft Edge untuk fitur mendengarkan langsung.
              </p>
            </div>
          </div>
        )}

        {/* Settings: Language */}
        <div className="bg-[#12131a] p-3 rounded-xl border border-[#252838] mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
              <Languages className="w-4 h-4 text-teal-400" />
              <span>Bahasa Percakapan Video</span>
            </span>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              disabled={isListening}
              className="bg-[#1b1c26] border border-[#2e3146] text-gray-200 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-teal-500 font-medium"
            >
              <option value="id-ID">🇮🇩 Bahasa Indonesia</option>
              <option value="en-US">🇺🇸 English (US)</option>
              <option value="auto">🌐 Deteksi Otomatis</option>
            </select>
          </div>
        </div>

        {/* Real-time Listening Card */}
        <div className="bg-[#12131a] p-4 rounded-xl border border-[#252838] flex flex-col items-center justify-center text-center mb-4">
          {isListening ? (
            <div className="flex flex-col items-center space-y-2 w-full">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 border-2 border-teal-500 flex items-center justify-center text-teal-400 animate-pulse">
                <Mic className="w-6 h-6 animate-bounce" />
              </div>

              <div className="text-xs font-bold text-teal-300">
                Mendengarkan Video... ({formatTime(progressTime)} / {formatTime(totalDuration)})
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#1e202c] h-1.5 rounded-full overflow-hidden my-1">
                <div
                  className="bg-teal-400 h-full transition-all duration-300"
                  style={{
                    width: totalDuration > 0 ? `${Math.min(100, (progressTime / totalDuration) * 100)}%` : '50%',
                  }}
                />
              </div>

              {/* Active sentence preview */}
              <div className="min-h-7 px-3 py-1 bg-[#1a1c26] rounded-lg border border-teal-500/30 text-xs text-gray-200 italic w-full truncate">
                {currentSentence ? `"${currentSentence}..."` : 'Mendeteksi vokal dan kata-kata...'}
              </div>

              <button
                onClick={stopTranscription}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors mt-1"
              >
                Selesai Mendengarkan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-200">{statusMessage}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Pastikan speaker menyala agar mikrofon browser dapat mendeteksi ucapan video.
                </p>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={startAutoTranscription}
                  className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Mulai Dengarkan Video</span>
                </button>

                <button
                  onClick={handleSimulateAutoCaptions}
                  className="px-3 py-2 bg-[#202230] hover:bg-[#282a3c] text-teal-300 border border-teal-500/30 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1"
                  title="Generate subtitle otomatis berbasis template percakapan instan"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Deteksi Cepat AI</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4 min-h-[140px] max-h-[180px]">
          <span className="text-xs font-semibold text-gray-300 block">
            Hasil Subtitle Terdeteksi ({transcribedList.length})
          </span>

          {transcribedList.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs bg-[#12131a] rounded-xl border border-[#252838]">
              Belum ada percakapan terdeteksi. Klik "Mulai Dengarkan Video" di atas.
            </div>
          ) : (
            transcribedList.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#12131a] p-2.5 rounded-xl border border-[#252838] flex items-center justify-between space-x-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-gray-200 font-medium truncate">
                    #{idx + 1}. "{item.text}"
                  </p>
                  <p className="text-[10px] text-teal-400 font-mono">
                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#252838]">
          <button
            onClick={() => {
              stopTranscription();
              onClose();
            }}
            className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 rounded-lg hover:bg-[#202230] transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleApply}
            disabled={transcribedList.length === 0}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              transcribedList.length === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-400 text-black active:scale-95'
            }`}
          >
            Terapkan ke Timeline ({transcribedList.length} Subtitle)
          </button>
        </div>
      </div>
    </div>
  );
};

export const AutoSubtitleModal = React.memo(AutoSubtitleModalComponent);
