import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { StyloResult } from './StyloApp';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { VideoIcon } from './icons/VideoIcon';
import { generateVideoPromptFromImage, generatePromotionalScript, generateVideoConceptIdea } from '../services/geminiService';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadedImage } from '../types';


const VoiceoverIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
);


interface StyloPreviewModalProps {
  results: StyloResult[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onNavigateToApp: (appId: string) => void;
  onUpdateVideoPrompt: (index: number, prompt: string) => void;
  productDescription: string;
  onUpdatePromoScript: (index: number, script: string) => void;
  onOpenVideoModal?: () => void;
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: "easeIn" } }
};

type PanelView = 'input' | 'loading' | 'result' | 'error';
type ActivePanel = 'cinematic' | 'promo';


const StyloPreviewModal: React.FC<StyloPreviewModalProps> = ({
  results,
  currentIndex,
  onClose,
  onNavigate,
  onRegenerate,
  isRegenerating,
  onNavigateToApp,
  onUpdateVideoPrompt,
  productDescription,
  onUpdatePromoScript,
  onOpenVideoModal,
}) => {
  const [activeSidePanel, setActiveSidePanel] = useState<ActivePanel | null>(null);
  const [panelView, setPanelView] = useState<PanelView>('input');

  // State
  const [userGuidance, setUserGuidance] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [videoPromptError, setVideoPromptError] = useState('');
  const [generatedPromoScript, setGeneratedPromoScript] = useState('');
  const [promoScriptError, setPromoScriptError] = useState('');

  const currentResult = results[currentIndex];

  const handleNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % results.length;
    onNavigate(nextIndex);
  }, [currentIndex, results.length, onNavigate]);

  const handlePrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + results.length) % results.length;
    onNavigate(prevIndex);
  }, [currentIndex, results.length, onNavigate]);

  useEffect(() => {
    // Reset panel view when navigating between images
    setActiveSidePanel(null);
    setUserGuidance('');
    setVideoPromptError('');
    setGeneratedPrompt('');
    setGeneratedPromoScript('');
    setIsGeneratingIdea(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);
  
  const handleGenerateIdea = async () => {
    if (!currentResult) return;
    setIsGeneratingIdea(true);
    setVideoPromptError('');
    try {
        const imageUrl = currentResult.imageUrl;
        const mimeType = imageUrl.match(/^data:(.*?);/)?.[1] || 'image/png';
        const base64String = imageUrl.split(',')[1];
        if (!base64String) throw new Error("Format data URL gambar tidak valid.");
        const image: UploadedImage = { base64: base64String, mimeType, name: 'scene_image.png' };
        
        const idea = await generateVideoConceptIdea(image); 
        setUserGuidance(idea);
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Gagal mendapatkan ide.';
        setVideoPromptError(error);
        setPanelView('error');
    } finally {
        setIsGeneratingIdea(false);
    }
  };

  const handleGenerateVideoPrompt = async () => {
    if (!currentResult) return;
    
    setPanelView('loading');

    try {
        const imageUrl = currentResult.imageUrl;
        const mimeTypeMatch = imageUrl.match(/^data:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png'; // Fallback
        const base64String = imageUrl.split(',')[1];
        
        if (!base64String) {
            throw new Error("Format data URL gambar tidak valid.");
        }

        const promptText = await generateVideoPromptFromImage(base64String, mimeType, userGuidance);
        setGeneratedPrompt(promptText);
        onUpdateVideoPrompt(currentIndex, promptText);
        setPanelView('result');
    } catch(e) {
        const error = e instanceof Error ? e.message : 'Gagal membuat prompt video.';
        setVideoPromptError(error);
        setPanelView('error');
    }
  };

  const handleGeneratePromoScript = async () => {
    if (!currentResult) return;
    setPanelView('loading');
    try {
      const imageUrl = currentResult.imageUrl;
      const mimeType = imageUrl.match(/^data:(.*?);/)?.[1] || 'image/png';
      const base64 = imageUrl.split(',')[1];
      if (!base64) throw new Error("Format data URL gambar tidak valid.");
      const productImage: UploadedImage = { base64, mimeType, name: 'product_image.png' };

      const script = await generatePromotionalScript(productImage, productDescription);
      setGeneratedPromoScript(script);
      onUpdatePromoScript(currentIndex, script);
      setPanelView('result');
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Gagal membuat naskah promosi.';
      setPromoScriptError(error);
      setPanelView('error');
    }
  };
  
  const togglePanel = (panel: ActivePanel) => {
    // If clicking the same button to close, or if the panel is already open and we're switching
    if (activeSidePanel === panel) {
        setActiveSidePanel(null);
        return;
    }

    // Reset states before opening a new panel
    setVideoPromptError('');
    setPromoScriptError('');
    setUserGuidance('');

    // Open the new panel
    setActiveSidePanel(panel);

    // Determine its initial view
    if (panel === 'cinematic' && currentResult?.videoPrompt) {
        setGeneratedPrompt(currentResult.videoPrompt);
        setPanelView('result');
    } else if (panel === 'promo' && currentResult?.promoScript) {
        setGeneratedPromoScript(currentResult.promoScript);
        setPanelView('result');
    } else {
        setPanelView('input');
    }
  };


  const handleOpenInVideoGenerator = () => {
    if (generatedPrompt && currentResult) {
        const seededData = {
            imageUrl: currentResult.imageUrl,
            prompt: generatedPrompt,
        };
        sessionStorage.setItem('video-generator-seed', JSON.stringify(seededData));
        onNavigateToApp('video');
    }
  };

  const handleSendToVoiceover = () => {
    if(generatedPromoScript) {
        sessionStorage.setItem('voiceover-studio-seed-script', generatedPromoScript);
        onNavigateToApp('voiceover');
    }
  }

  if (!currentResult) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentResult.imageUrl;
    link.download = `stylo-result-${currentIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const renderCinematicPanel = () => {
      switch (panelView) {
          case 'input':
              return (
                  <>
                    <div className="flex-grow flex flex-col gap-2">
                        <p className="text-xs text-gray-400 mb-0">Tulis ide atau konsep video Anda, atau biarkan AI membantu.</p>
                        <textarea
                            value={userGuidance}
                            onChange={(e) => setUserGuidance(e.target.value)}
                            placeholder="Contoh: Buat video ini terlihat seperti film lama, dengan efek hujan..."
                            className="w-full flex-grow p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500"
                        />
                         <button 
                            onClick={handleGenerateIdea}
                            disabled={isGeneratingIdea}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white font-semibold hover:bg-gray-600 text-sm disabled:opacity-50"
                        >
                            <SparklesIcon /> {isGeneratingIdea ? 'Mencari Inspirasi...' : 'Dapatkan Ide Inspirasi AI'}
                        </button>
                    </div>
                    <div className="mt-4 flex-shrink-0">
                        <button onClick={handleGenerateVideoPrompt} disabled={isGeneratingIdea} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition text-sm disabled:opacity-50">
                            <SparklesIcon /> Buat Prompt Lengkap
                        </button>
                    </div>
                  </>
              );
          case 'loading':
              return <div className="flex-grow flex items-center justify-center"><Loader message="Membuat prompt..."/></div>;
          case 'error':
              return (
                 <>
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-red-400 text-center">{videoPromptError}</p>
                    </div>
                    <div className="mt-4 flex-shrink-0">
                       <button onClick={() => setPanelView('input')} className="w-full px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition text-sm">
                           Kembali
                       </button>
                   </div>
                 </>
              );
          case 'result':
              return (
                  <>
                    <div className="flex-grow bg-gray-900 p-3 rounded-md text-sm text-gray-300 font-mono overflow-y-auto min-h-[150px] border border-gray-600">
                      <p className="whitespace-pre-wrap break-words w-full">{generatedPrompt}</p>
                    </div>
                     <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                        <button onClick={() => setPanelView('input')} className="text-center px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition text-sm">
                            Kembali
                        </button>
                        <button onClick={handleOpenInVideoGenerator} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition text-sm">
                            Buka di Video Generator
                        </button>
                    </div>
                  </>
              )
          default:
              return null;
      }
  }

  const renderPromoScriptPanel = () => {
    switch (panelView) {
        case 'input':
            return (
                <div className="flex-grow flex flex-col justify-center items-center text-center">
                    <p className="text-sm text-gray-400 mb-4">AI akan membuat naskah promosi singkat (~8 detik) untuk diucapkan oleh model.</p>
                    <button onClick={handleGeneratePromoScript} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition text-sm">
                        <SparklesIcon /> Buat Naskah Promosi
                    </button>
                </div>
            );
        case 'loading':
            return <div className="flex-grow flex items-center justify-center"><Loader message="Menulis naskah..."/></div>;
        case 'error':
             return (
                 <>
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-red-400 text-center">{promoScriptError}</p>
                    </div>
                    <div className="mt-4 flex-shrink-0">
                       <button onClick={() => setPanelView('input')} className="w-full px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition text-sm">
                           Kembali
                       </button>
                   </div>
                 </>
              );
        case 'result':
            return (
                <>
                    <div className="flex-grow bg-gray-900 p-3 rounded-md text-sm text-gray-300 font-mono overflow-y-auto min-h-[150px] border border-gray-600">
                        <p className="whitespace-pre-wrap break-words w-full">{`"${generatedPromoScript}"`}</p>
                    </div>
                     <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                        <button onClick={() => setPanelView('input')} className="text-center px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition text-sm">
                            Ulangi
                        </button>
                        <button onClick={handleSendToVoiceover} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 transition text-sm">
                           <VoiceoverIcon/> Kirim ke Voiceover
                        </button>
                    </div>
                </>
            );
        default: return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <motion.div
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-700 shadow-xl w-full p-6 flex flex-row gap-6 overflow-hidden"
        style={{ maxWidth: activeSidePanel ? '72rem' : '48rem' }} /* 72rem = max-w-6xl, 48rem=max-w-3xl */
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Image and controls */}
        <div className="flex-1 flex flex-col items-center justify-start min-w-0 relative">
          <div className="w-full h-full flex items-center justify-center">
             <motion.img
                key={currentResult.imageUrl}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                src={currentResult.imageUrl}
                alt={`Pratinjau foto model yang dihasilkan`}
                className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
             {isRegenerating && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
                    <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-t-transparent"/>
                    <p className="text-sm mt-2">Membuat ulang...</p>
                </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-700 mt-4 flex-shrink-0">
              <button onClick={handleDownload} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-green-600 transition" title="Unduh"><DownloadIcon /> <span className="hidden sm:inline">Unduh</span></button>
              <button onClick={onRegenerate} disabled={isRegenerating} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-blue-600 transition disabled:opacity-50" title="Ulangi"><RegenerateIcon /> <span className="hidden sm:inline">Regenerate</span></button>
              <button onClick={() => togglePanel('cinematic')} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-purple-600 transition" title="Buat Prompt Video">
                  <VideoIcon />
                  <span className="hidden sm:inline">{currentResult.videoPrompt ? 'Lihat Prompt' : 'Buat Prompt'}</span>
              </button>
               <button onClick={() => togglePanel('promo')} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-teal-600 transition" title="Buat Naskah Promosi">
                  <VoiceoverIcon />
                  <span className="hidden sm:inline">{currentResult.promoScript ? 'Lihat Naskah' : 'Buat Naskah'}</span>
              </button>
              {onOpenVideoModal && <button onClick={onOpenVideoModal} disabled={!currentResult.videoPrompt || isRegenerating} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-indigo-600 transition disabled:opacity-50" title="Buat Video"><VideoIcon /> <span className="hidden sm:inline">Buat Video</span></button>}
          </div>
          <button onClick={onClose} className="absolute top-0 right-0 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition" title="Tutup"><CloseIcon /></button>
          {results.length > 1 && (
            <>
              <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition"><ChevronLeftIcon /></button>
              <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition z-10"><ChevronRightIcon /></button>
            </>
          )}
        </div>

        {/* Right Side: Creative Panel */}
        <AnimatePresence>
          {activeSidePanel && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="w-96 flex-shrink-0 bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col"
            >
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                 <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <button onClick={() => togglePanel('cinematic')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeSidePanel === 'cinematic' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Prompt Sinematik</button>
                    <button onClick={() => togglePanel('promo')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeSidePanel === 'promo' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Naskah Promosi</button>
                </div>
                <button onClick={() => setActiveSidePanel(null)} className="text-gray-400 hover:text-white">
                  <CloseIcon />
                </button>
              </div>
              
              {activeSidePanel === 'cinematic' ? renderCinematicPanel() : renderPromoScriptPanel()}

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default StyloPreviewModal;