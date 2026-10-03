import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ExternalLink,
  Copy
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageUtils.ts';

interface ImageDualUploaderProps {
  currentImageUrl?: string;
  onImageChange: (newImageUrl: string) => void;
  label?: string;
  sublabel?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'video' | 'banner' | 'auto';
  allowClear?: boolean;
  className?: string;
}

export const ImageDualUploader: React.FC<ImageDualUploaderProps> = ({
  currentImageUrl,
  onImageChange,
  label = 'Imagen',
  sublabel = 'Sube un archivo desde tu computador o pega un enlace de Dropi / Web',
  placeholder = 'https://...',
  aspectRatio = 'square',
  allowClear = true,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [inputUrl, setInputUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('El archivo seleccionado no es una imagen válida.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const dataUrl = await compressImageFile(file);
      onImageChange(dataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la imagen.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    setErrorMsg(null);
    onImageChange(inputUrl.trim());
    setInputUrl('');
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'video': return 'aspect-video';
      case 'banner': return 'aspect-[21/9]';
      case 'auto': return 'h-28';
      default: return 'aspect-square';
    }
  };

  return (
    <div className={`space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 ${className}`}>
      
      {/* Header with Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          {label && (
            <label className="block text-xs font-black text-slate-900 tracking-tight">
              {label}
            </label>
          )}
          {sublabel && (
            <p className="text-[11px] text-slate-500">{sublabel}</p>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-600" />
            <span>📁 Desde PC</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>🔗 Por Enlace / Dropi</span>
          </button>
        </div>
      </div>

      {/* Main Upload / URL Controls & Preview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        
        {/* Current Image Preview */}
        <div className="sm:col-span-1">
          <div className={`relative rounded-xl overflow-hidden border-2 bg-white flex items-center justify-center ${getAspectClass()} ${
            currentImageUrl ? 'border-slate-300 shadow-xs' : 'border-dashed border-slate-300'
          }`}>
            {currentImageUrl ? (
              <>
                <img
                  src={currentImageUrl}
                  alt="Vista previa"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300';
                  }}
                />
                {allowClear && (
                  <button
                    type="button"
                    onClick={() => onImageChange('')}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600/90 hover:bg-rose-700 text-white shadow-md cursor-pointer transition-colors"
                    title="Quitar imagen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                <ImageIcon className="w-6 h-6 stroke-1 mb-1" />
                <span className="text-[10px] font-bold">Sin Imagen</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Area (Upload or URL) */}
        <div className="sm:col-span-2 space-y-2">
          {activeTab === 'upload' ? (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1 ${
                  isDragging
                    ? 'border-cyan-600 bg-cyan-100/70 text-cyan-900 scale-[1.01]'
                    : 'border-cyan-400/80 bg-white hover:bg-cyan-50/60 text-slate-700'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-800 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                    <span>Procesando archivo local...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-cyan-600" />
                    <span className="font-extrabold text-xs text-slate-900">
                      Haz clic para examinar o arrastra una imagen aquí
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Formatos soportados: PNG, JPG, JPEG, WebP, SVG
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlSubmit();
                    }
                  }}
                  placeholder={placeholder || 'https://dropi.co/cdn/images/ejemplo.jpg'}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleUrlSubmit()}
                  disabled={!inputUrl.trim()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar</span>
                </button>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-tight">
                💡 <span className="font-semibold">Tip Dropi:</span> Haz clic derecho en la foto del producto en Dropi, selecciona <span className="font-semibold">"Copiar dirección de imagen"</span> y pégala aquí.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
