import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, Check, ChevronDown, Play } from 'lucide-react';
import { 
  getAvailableSpanishVoices, 
  getBestSpanishVoice, 
  saveUserVoiceChoice, 
  getSavedVoiceName,
  createNaturalSpeechUtterance,
  isMaleVoice
} from '../../utils/naturalVoiceSynthesizer.ts';

interface AssistantVoiceSelectorProps {
  onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
  className?: string;
  theme?: 'dark' | 'light';
}

export const AssistantVoiceSelector: React.FC<AssistantVoiceSelectorProps> = ({
  onVoiceChange,
  className = '',
  theme = 'dark'
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const spanishVoices = getAvailableSpanishVoices();
      setVoices(spanishVoices);

      const saved = getSavedVoiceName();
      if (saved && spanishVoices.some(v => v.name === saved)) {
        setSelectedVoiceName(saved);
      } else {
        const best = getBestSpanishVoice();
        if (best) {
          setSelectedVoiceName(best.name);
          if (onVoiceChange) onVoiceChange(best);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      // no cleanup needed for onvoiceschanged
    };
  }, [onVoiceChange]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoiceName(val);
    saveUserVoiceChoice(val);
    const chosen = voices.find(v => v.name === val);
    if (chosen && onVoiceChange) {
      onVoiceChange(chosen);
    }
  };

  const handlePlaySample = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const chosen = voices.find(v => v.name === selectedVoiceName) || getBestSpanishVoice();
    const utterance = createNaturalSpeechUtterance(
      'Hola, soy tu copiloto ejecutiva de Zavela Store. El perímetro de seguridad y las ventas se encuentran en orden.',
      {
        voice: chosen,
        onStart: () => setIsPlayingSample(true),
        onEnd: () => setIsPlayingSample(false),
        onError: () => setIsPlayingSample(false)
      }
    );

    window.speechSynthesis.speak(utterance);
  };

  if (voices.length === 0) return null;

  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <label 
        htmlFor="assistant-voice-select" 
        className={`text-[11px] font-bold flex items-center gap-1 ${
          isDark ? 'text-slate-300' : 'text-slate-700'
        }`}
      >
        <Volume2 className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden xs:inline">Voz del Asistente:</span>
      </label>

      <div className="relative">
        <select
          id="assistant-voice-select"
          value={selectedVoiceName}
          onChange={handleSelect}
          className={`text-[11px] font-medium py-1 pl-2.5 pr-7 rounded-xl border outline-none cursor-pointer transition-all appearance-none max-w-[200px] sm:max-w-[240px] truncate ${
            isDark 
              ? 'bg-slate-800 text-slate-100 border-slate-700 hover:border-slate-600 focus:border-sky-500' 
              : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 focus:border-sky-500 shadow-2xs'
          }`}
          title="Seleccionar voz en español para el copiloto"
        >
          {voices.map(v => {
            const isFemale = !isMaleVoice(v);
            const isNeural = v.name.toLowerCase().includes('natural') || 
                             v.name.toLowerCase().includes('neural') || 
                             v.name.toLowerCase().includes('online') ||
                             v.name.toLowerCase().includes('google');
            return (
              <option key={v.name} value={v.name}>
                {isNeural ? '✨ ' : ''}{isFemale ? '👩 ' : '👤 '}{v.name.replace(/Microsoft |Google /g, '')} ({v.lang})
              </option>
            );
          })}
        </select>
        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <button
        type="button"
        onClick={handlePlaySample}
        disabled={isPlayingSample}
        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
          isDark 
            ? 'bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-400/30' 
            : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
        }`}
        title="Probar cómo suena esta voz femenina"
      >
        <Play className={`w-2.5 h-2.5 ${isPlayingSample ? 'animate-pulse text-emerald-400 fill-emerald-400' : ''}`} />
        <span>{isPlayingSample ? 'Probando...' : 'Probar'}</span>
      </button>
    </div>
  );
};
