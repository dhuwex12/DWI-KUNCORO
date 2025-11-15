import React, { useReducer, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { UploadedImage, AdGenResult, Scene, CreativeDirection } from '../types';
import { 
    analyzeProductWithInternet,
    suggestCreativeDirection,
    visualizeScene,
    generateCinematicVideoPrompt,
    generateVideo,
    checkVideoStatus,
    // FIX: Imported the newly created functions for the two-step script and visual generation workflow.
    generateVoiceoverScript,
    generateVisualsFromScript,
} from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { FilmIcon } from './icons/FilmIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import PromptModal from './PromptModal';
import VideoGenerationModal from './VideoGenerationModal';
import { VideoIcon } from './icons/VideoIcon';
import { InfoIcon } from './icons/InfoIcon';
import AdsStoryboardProInfoModal from './AIAffiliatorInfoModal';
import FreeTierVideoWarningModal from './FreeTierVideoWarningModal';
import CustomOutfitModal from './CustomOutfitModal';


// --- Preview Modal Component ---
const ScenePreviewModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `scene-visual-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={imageUrl} alt="Scene Preview" className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl" />
        <div className="absolute top-4 right-4 flex gap-3">
          <button onClick={handleDownload} className="text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition" title="Unduh">
            <DownloadIcon />
          </button>
          <button onClick={onClose} className="text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition" title="Tutup">
            <CloseIcon />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MiniSpinner: React.FC = () => <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>;

// --- Types & Constants ---
// FIX: Added 'lighting' and 'outfit' to CREATIVE_OPTIONS to be rendered in the UI loop.
const CREATIVE_OPTIONS = {
    targetAudience: ['Milenial Aktif', 'GenZ Trendsetter', 'Profesional Muda', 'Keluarga', 'Custom'],
    vibe: ['Sinematik & Epik', 'Modern & Bersih', 'Energik & Menyenangkan', 'Alami & Organik', 'Mewah & Elegan', 'Nostalgia 90-an', 'Futuristik & Tekno', 'Hangat & Nyaman', 'Custom'],
    contentType: ['Storytelling', 'Hardselling', 'Softselling', 'Masalah/Solusi', 'Unboxing'],
    scriptFramework: ['AI-Recommended', 'AIDA', 'PAS', 'BAB', 'The 4 Ps', `Hero's Journey`], // New
    duration: [30, 45, 60],
    aspectRatio: ['9:16', '16:9', '3:4', '4:5'],
    lighting: ['Mode Cerdas', 'Lampu Studio', 'Dramatis', 'Cahaya Alami', 'Neon'],
    outfit: ['Sesuai Gambar Asli', 'Sesuaikan dengan Produk', 'Elegan & Formal', 'Kasual Modern', 'Profesional Bisnis', 'Sporty & Aktif', 'Kustom'],
};


interface AdsStoryboardProProps {
    onNavigateToApp: (appId: string) => void;
}

const VoiceoverIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
);

interface SceneAsset {
    imageUrl: string | 'loading' | 'error' | null;
    videoPrompt: string | 'loading' | 'error' | null;
}

// --- State & Reducer ---
interface AIAffiliatorState {
  productImage: UploadedImage | null;
  modelImage: UploadedImage | null;
  productName: string;
  isAnalyzingProduct: boolean;
  isSuggestingDirection: boolean;
  productDescription: string;
  creativeDirection: CreativeDirection & { scriptFramework: string };
  customTargetAudience: string;
  customVibe: string;
  customOutfit: string;
  creativeIdea: string;
  isGeneratingStoryboard: boolean;
  storyboardResult: AdGenResult | null;
  sceneAssets: Record<number, SceneAsset>;
  error: string | null;
  isScriptModalOpen: boolean;
  previewingImageUrl: string | null;
  promptModalContent: string | null;
  // New state for 2-step workflow
  workflowStep: 'input' | 'script_review' | 'storyboard_generated';
  voiceoverScriptDraft: string;
  isGeneratingScript: boolean;
}

const initialState: AIAffiliatorState = {
  productImage: null,
  modelImage: null,
  productName: '',
  isAnalyzingProduct: false,
  isSuggestingDirection: false,
  productDescription: '',
  creativeDirection: {
    targetAudience: 'Milenial Aktif',
    vibe: 'Energik & Menyenangkan',
    contentType: 'Storytelling',
    scriptFramework: 'AI-Recommended',
    duration: 30,
    aspectRatio: '9:16',
    lighting: 'Mode Cerdas',
    outfit: 'Sesuai Gambar Asli',
  },
  customTargetAudience: '',
  customVibe: '',
  customOutfit: '',
  creativeIdea: '',
  isGeneratingStoryboard: false,
  storyboardResult: null,
  sceneAssets: {},
  error: null,
  isScriptModalOpen: false,
  previewingImageUrl: null,
  promptModalContent: null,
  // New state
  workflowStep: 'input',
  voiceoverScriptDraft: '',
  isGeneratingScript: false,
};

type Action =
  | { type: 'SET_IMAGE'; payload: { field: 'productImage' | 'modelImage', image: UploadedImage | null } }
  | { type: 'SET_FIELD'; payload: { field: keyof AIAffiliatorState; value: any } }
  | { type: 'ANALYZE_PRODUCT_START' }
  | { type: 'ANALYZE_PRODUCT_SUCCESS'; payload: { productName: string; productDescription: string } }
  | { type: 'ANALYZE_PRODUCT_ERROR'; payload: string }
  | { type: 'SUGGEST_DIRECTION_START' }
  | { type: 'SUGGEST_DIRECTION_SUCCESS'; payload: { audience: string; vibe: string } }
  | { type: 'SUGGEST_DIRECTION_ERROR' }
  | { type: 'SET_DIRECTION'; payload: { field: keyof CreativeDirection | 'scriptFramework'; value: string | number } }
  | { type: 'GENERATE_SCRIPT_START' }
  | { type: 'GENERATE_SCRIPT_SUCCESS'; payload: string }
  | { type: 'GENERATE_SCRIPT_ERROR'; payload: string }
  | { type: 'GENERATE_STORYBOARD_START' }
  | { type: 'GENERATE_STORYBOARD_SUCCESS'; payload: AdGenResult }
  | { type: 'GENERATE_STORYBOARD_ERROR'; payload: string }
  | { type: 'VISUALIZE_SCENE_START'; payload: number }
  | { type: 'VISUALIZE_SCENE_SUCCESS'; payload: { scene_number: number; imageUrl: string } }
  | { type: 'VISUALIZE_SCENE_ERROR'; payload: number }
  | { type: 'UPDATE_SCENE_DESCRIPTION'; payload: { scene_number: number; newDescription: string } }
  | { type: 'GENERATE_VIDEO_PROMPT_START'; payload: number }
  | { type: 'GENERATE_VIDEO_PROMPT_SUCCESS'; payload: { scene_number: number; prompt: string } }
  | { type: 'GENERATE_VIDEO_PROMPT_ERROR'; payload: number }
  | { type: 'RESET_STEP'; payload: 'storyboard' | 'full' }
  | { type: 'TOGGLE_SCRIPT_MODAL' };

function reducer(state: AIAffiliatorState, action: Action): AIAffiliatorState {
  const updateSceneAsset = (sceneNumber: number, newAssetData: Partial<SceneAsset>) => {
    return {
        ...state.sceneAssets,
        [sceneNumber]: {
            ...(state.sceneAssets[sceneNumber] || { imageUrl: null, videoPrompt: null }),
            ...newAssetData,
        }
    };
  };

  switch (action.type) {
    case 'SET_IMAGE':
      if (action.payload.field === 'productImage') {
        return { ...initialState, productImage: action.payload.image };
      }
      return { ...state, [action.payload.field]: action.payload.image, storyboardResult: null };
    case 'SET_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'ANALYZE_PRODUCT_START':
      return { ...state, isAnalyzingProduct: true, productName: 'AI sedang menganalisis...', productDescription: 'AI sedang mencari informasi di internet...' };
    case 'ANALYZE_PRODUCT_SUCCESS':
      return { ...state, isAnalyzingProduct: false, productName: action.payload.productName, productDescription: action.payload.productDescription, error: null };
    case 'ANALYZE_PRODUCT_ERROR':
      return { ...state, isAnalyzingProduct: false, productName: 'Gagal menganalisis. Silakan isi manual.', productDescription: 'Gagal mendapatkan deskripsi. Silakan isi manual.', error: action.payload };
    case 'SUGGEST_DIRECTION_START':
      return { ...state, isSuggestingDirection: true };
    case 'SUGGEST_DIRECTION_SUCCESS': {
      const newCreativeDirection = { ...state.creativeDirection };
      if (CREATIVE_OPTIONS.targetAudience.includes(action.payload.audience)) {
        newCreativeDirection.targetAudience = action.payload.audience;
      }
      if (CREATIVE_OPTIONS.vibe.includes(action.payload.vibe)) {
        newCreativeDirection.vibe = action.payload.vibe;
      }
      return { ...state, isSuggestingDirection: false, creativeDirection: newCreativeDirection };
    }
    case 'SUGGEST_DIRECTION_ERROR':
      return { ...state, isSuggestingDirection: false }; // Fail silently
    case 'SET_DIRECTION':
      return { ...state, creativeDirection: { ...state.creativeDirection, [action.payload.field]: action.payload.value } };
    case 'GENERATE_SCRIPT_START':
      return { ...state, isGeneratingScript: true, error: null, voiceoverScriptDraft: '' };
    case 'GENERATE_SCRIPT_SUCCESS':
      return { ...state, isGeneratingScript: false, voiceoverScriptDraft: action.payload, workflowStep: 'script_review' };
    case 'GENERATE_SCRIPT_ERROR':
      return { ...state, isGeneratingScript: false, error: action.payload };
    case 'GENERATE_STORYBOARD_START':
      return { ...state, isGeneratingStoryboard: true, error: null, storyboardResult: null, sceneAssets: {} };
    case 'GENERATE_STORYBOARD_SUCCESS':
      return { ...state, isGeneratingStoryboard: false, storyboardResult: action.payload, workflowStep: 'storyboard_generated' };
    case 'GENERATE_STORYBOARD_ERROR':
      return { ...state, isGeneratingStoryboard: false, error: action.payload };
    case 'VISUALIZE_SCENE_START':
        return { ...state, sceneAssets: updateSceneAsset(action.payload, { imageUrl: 'loading', videoPrompt: null }) };
    case 'VISUALIZE_SCENE_SUCCESS':
        return { ...state, sceneAssets: updateSceneAsset(action.payload.scene_number, { imageUrl: action.payload.imageUrl }) };
    case 'VISUALIZE_SCENE_ERROR':
        return { ...state, sceneAssets: updateSceneAsset(action.payload, { imageUrl: 'error' }) };
    case 'UPDATE_SCENE_DESCRIPTION': {
        if (!state.storyboardResult) return state;
        const newScenes = state.storyboardResult.mainStoryboard.scenes.map(scene => {
            if (scene.scene_number === action.payload.scene_number) {
                return { ...scene, visual_description: action.payload.newDescription };
            }
            return scene;
        });
        const newStoryboardResult = {
            ...state.storyboardResult,
            mainStoryboard: {
                ...state.storyboardResult.mainStoryboard,
                scenes: newScenes,
            },
        };
        return { ...state, storyboardResult: newStoryboardResult };
    }
    case 'GENERATE_VIDEO_PROMPT_START':
        return { ...state, sceneAssets: updateSceneAsset(action.payload, { videoPrompt: 'loading' }) };
    case 'GENERATE_VIDEO_PROMPT_SUCCESS':
        return { ...state, sceneAssets: updateSceneAsset(action.payload.scene_number, { videoPrompt: action.payload.prompt }) };
    case 'GENERATE_VIDEO_PROMPT_ERROR':
        return { ...state, sceneAssets: updateSceneAsset(action.payload, { videoPrompt: 'error' }) };
    case 'RESET_STEP':
        if (action.payload === 'storyboard') {
            return { ...state, storyboardResult: null, sceneAssets: {}, error: null, workflowStep: 'input', voiceoverScriptDraft: '' };
        }
        return initialState;
    case 'TOGGLE_SCRIPT_MODAL':
        return { ...state, isScriptModalOpen: !state.isScriptModalOpen };
    default:
      return state;
  }
}

// --- Sub-components ---
const Step: React.FC<{ number: number; title: string; children: React.ReactNode; isComplete?: boolean; isEnabled?: boolean }> = ({ number, title, children, isComplete = false, isEnabled = true }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg transition-opacity duration-500 ${!isEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white transition-colors ${isComplete ? 'bg-green-500' : 'bg-indigo-600'}`}>{number}</div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className={`${!isEnabled ? 'pointer-events-none' : ''}`}>{children}</div>
    </motion.div>
);

const SceneCard: React.FC<{
    scene: Scene;
    asset: SceneAsset;
    onDescriptionChange: (newDescription: string) => void;
    onVisualize: () => void;
    onGenerateVideoPrompt: () => void;
    onShowPrompt: () => void;
    onGenerateVideo: () => void;
    onPreview: () => void;
}> = ({ scene, asset, onDescriptionChange, onVisualize, onGenerateVideoPrompt, onShowPrompt, onGenerateVideo, onPreview }) => {

    const renderMediaArea = () => {
      const isVisualizing = asset.imageUrl === 'loading';
      const hasImage = typeof asset.imageUrl === 'string';

      if (isVisualizing) {
          return <div className="w-full h-full flex flex-col items-center justify-center text-center"><Loader message="Membuat visual..." /><p className="text-xs mt-2 text-gray-500">Ini mungkin butuh waktu...</p></div>;
      }
      if (asset.imageUrl === 'error') {
          return <p className="text-red-400 text-sm p-2 text-center">Gagal membuat visual.</p>;
      }
      if (hasImage) {
          return <img src={asset.imageUrl as string} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />;
      }
      return (
          <div className="text-center text-gray-600">
              <FilmIcon />
              <p className="text-xs mt-1">Visual</p>
          </div>
      );
    };

    const renderActionButton = () => {
        const isVisualizing = asset.imageUrl === 'loading';
        const hasImage = typeof asset.imageUrl === 'string';
        const isGeneratingPrompt = asset.videoPrompt === 'loading';

        if (asset.imageUrl === 'error') {
            return (
                <button onClick={onVisualize} className="mt-auto w-full flex items-center justify-center gap-2 bg-red-800 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm hover:bg-red-700">
                    <RegenerateIcon /> Coba Lagi Visual
                </button>
            );
        }

        if (!hasImage) {
            return (
                <button onClick={onVisualize} disabled={isVisualizing} className="mt-auto w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm hover:bg-gray-600 disabled:opacity-50">
                    {isVisualizing ? 'Memproses...' : 'Visualisasikan'}
                </button>
            );
        }

        switch (asset.videoPrompt) {
            case null:
            case 'loading':
                return (
                    <button disabled className="mt-auto w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm opacity-50 cursor-wait">
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        Mempersiapkan...
                    </button>
                );
            case 'error':
                return (
                    <button onClick={onGenerateVideoPrompt} disabled={isGeneratingPrompt} className="mt-auto w-full flex items-center justify-center gap-2 bg-red-800 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm hover:bg-red-700 disabled:opacity-50">
                        <RegenerateIcon /> Coba Lagi Prompt
                    </button>
                );
            default:
                return (
                    <div className="mt-auto w-full flex flex-col sm:flex-row gap-2">
                        <button onClick={onShowPrompt} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm hover:bg-blue-500">
                            Lihat Prompt
                        </button>
                        <button onClick={onGenerateVideo} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm hover:bg-purple-500">
                            <VideoIcon /> Buat Video
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h4 className="font-bold text-indigo-400">Adegan {scene.scene_number}</h4>
            </div>
            
            <button onClick={onPreview} disabled={typeof asset.imageUrl !== 'string'} className="aspect-[9/16] bg-gray-900 flex items-center justify-center relative group cursor-pointer disabled:cursor-default">
                {renderMediaArea()}
                {typeof asset.imageUrl === 'string' && asset.imageUrl !== 'loading' && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white font-bold">
                        <button onClick={(e) => { e.stopPropagation(); onVisualize(); }} className="flex items-center gap-2 bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30"><RegenerateIcon /> Ulangi Visual</button>
                    </div>
                )}
            </button>
            
            <div className="p-4 flex-grow flex flex-col gap-3">
                <div className="text-xs text-gray-400 h-32 overflow-y-auto bg-gray-900 p-2 rounded-md space-y-2">
                    <div>
                         <label className="text-gray-300 font-semibold block mb-1">Visual:</label>
                         <textarea
                            value={scene.visual_description}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                            className="w-full text-xs bg-gray-800 p-1 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 resize-none h-16"
                         />
                    </div>
                    <p className="italic"><strong className="text-gray-300">Naskah:</strong> "{scene.voiceover_script}"</p>
                </div>
                {renderActionButton()}
            </div>
        </div>
    );
};

const CombinedScriptModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    script: string;
    onSend: () => void;
}> = ({ isOpen, onClose, script, onSend }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(script).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">Gabungan Naskah Voiceover</h2>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-2 -mr-2 bg-gray-900 p-3 rounded-md">
                            <textarea
                                readOnly
                                value={script}
                                className="w-full h-full bg-transparent text-gray-300 border-none focus:ring-0 resize-none"
                                rows={10}
                            />
                        </div>
                        <div className="mt-6 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                            <button onClick={handleCopy} className="w-full sm:w-auto flex-1 text-center bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition">
                                {copied ? 'Naskah Tersalin!' : 'Salin Naskah'}
                            </button>
                            <button onClick={onSend} className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-500">
                                <VoiceoverIcon />
                                Kirim ke Studio Voiceover AI
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


const AdsStoryboardPro: React.FC<AdsStoryboardProProps> = ({ onNavigateToApp }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const { 
        productImage, modelImage, productName, isAnalyzingProduct, isSuggestingDirection, productDescription,
        creativeDirection, customTargetAudience, customVibe, customOutfit, creativeIdea, isGeneratingStoryboard, storyboardResult, sceneAssets, error, isScriptModalOpen,
        previewingImageUrl, promptModalContent, workflowStep, voiceoverScriptDraft, isGeneratingScript
    } = state;
    
    // --- Video Modal State ---
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [sceneToAnimate, setSceneToAnimate] = useState<Scene | null>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const videoPollingRef = useRef<number | null>(null);

    const [sceneForVideo, setSceneForVideo] = useState<Scene | null>(null);
    const [isFreeTierWarningOpen, setIsFreeTierWarningOpen] = useState(false);
    const [isCustomOutfitModalOpen, setIsCustomOutfitModalOpen] = useState(false);

    useEffect(() => {
        if (productImage && workflowStep === 'input' && !isAnalyzingProduct && !productName) {
            const analyzeAndSuggest = async () => {
                dispatch({ type: 'ANALYZE_PRODUCT_START' });
                try {
                    const { productName, productDescription } = await analyzeProductWithInternet(productImage);
                    dispatch({ type: 'ANALYZE_PRODUCT_SUCCESS', payload: { productName, productDescription } });
                    
                    dispatch({ type: 'SUGGEST_DIRECTION_START' });
                    const { suggestedAudience, suggestedVibe } = await suggestCreativeDirection(
                        productDescription, 
                        CREATIVE_OPTIONS.targetAudience, 
                        CREATIVE_OPTIONS.vibe
                    );
                    dispatch({ type: 'SUGGEST_DIRECTION_SUCCESS', payload: { audience: suggestedAudience, vibe: suggestedVibe } });

                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : 'Terjadi kesalahan tidak diketahui saat menganalisis produk.';
                    dispatch({ type: 'ANALYZE_PRODUCT_ERROR', payload: errorMessage });
                }
            };
            analyzeAndSuggest();
        }
    }, [productImage, workflowStep, isAnalyzingProduct, productName]);

    const handleGenerateScript = async () => {
        if (!productImage || !productDescription) return;
        dispatch({ type: 'GENERATE_SCRIPT_START' });
        const finalCreativeDirection = {
            ...creativeDirection,
            targetAudience: creativeDirection.targetAudience === 'Custom' ? customTargetAudience : creativeDirection.targetAudience,
            vibe: creativeDirection.vibe === 'Custom' ? customVibe : creativeDirection.vibe,
            outfit: creativeDirection.outfit === 'Kustom' ? customOutfit : creativeDirection.outfit,
        };
        try {
            const script = await generateVoiceoverScript(productImage, finalCreativeDirection, creativeIdea, modelImage);
            dispatch({ type: 'GENERATE_SCRIPT_SUCCESS', payload: script });
        } catch (err) {
            dispatch({ type: 'GENERATE_SCRIPT_ERROR', payload: err instanceof Error ? err.message : 'Gagal membuat naskah.' });
        }
    };

    const handleGenerateStoryboard = async () => {
        dispatch({ type: 'GENERATE_STORYBOARD_START' });
        try {
            const res = await generateVisualsFromScript(voiceoverScriptDraft, productImage, modelImage);
            dispatch({ type: 'GENERATE_STORYBOARD_SUCCESS', payload: res });
        } catch (err) {
            dispatch({ type: 'GENERATE_STORYBOARD_ERROR', payload: err instanceof Error ? err.message : 'Gagal membuat visual.' });
        }
    };

    const handleVisualizeScene = useCallback(async (scene: Scene) => {
        if (!productImage) return;
        dispatch({ type: 'VISUALIZE_SCENE_START', payload: scene.scene_number });
        try {
            const modelToUse = scene.scene_type === 'model_shot' && modelImage ? modelImage : null;
    
            let finalPrompt = '';
            let sceneDescription = scene.visual_description;
    
            if (modelToUse) {
                finalPrompt = `CRITICAL INSTRUCTION: The model's face, hair, and identity MUST be highly consistent with the provided model reference image. This is the top priority. Do not change the person. The final image must be a photorealistic, cinematic still.`;
    
                const { outfit } = creativeDirection;
                let outfitInstruction = '';
                if (outfit === 'Kustom' && customOutfit.trim()) {
                    outfitInstruction = ` The model should be wearing: "${customOutfit.trim()}".`;
                } else if (outfit === 'Sesuaikan dengan Produk') {
                    outfitInstruction = ` The model's outfit MUST be chosen by you to be thematically appropriate and complementary to the product being featured. Analyze the product and select the best possible clothing style.`;
                } else if (outfit && outfit !== 'Sesuai Gambar Asli') {
                    outfitInstruction = ` The model should be wearing an outfit that is "${outfit}".`;
                }
                finalPrompt += outfitInstruction;
                
                sceneDescription = `(model implied) ${scene.visual_description}`;
            } else {
                finalPrompt = `Create a photorealistic, cinematic still of the product.`;
            }
    
            finalPrompt += ` SCENE: ${sceneDescription}`;
    
            const response = await visualizeScene(finalPrompt, productImage, modelToUse);
            dispatch({ type: 'VISUALIZE_SCENE_SUCCESS', payload: { scene_number: scene.scene_number, imageUrl: response.imageUrl } });
        } catch (err) {
            dispatch({ type: 'VISUALIZE_SCENE_ERROR', payload: scene.scene_number });
        }
    }, [productImage, modelImage, creativeDirection, customOutfit]);

    const handleSceneDescriptionChange = (scene_number: number, newDescription: string) => {
        dispatch({ type: 'UPDATE_SCENE_DESCRIPTION', payload: { scene_number, newDescription } });
    };
    
    const handleGenerateVideoPrompt = useCallback(async (scene: Scene) => {
        const asset = sceneAssets[scene.scene_number];
        if (!asset || typeof asset.imageUrl !== 'string') return;
    
        dispatch({ type: 'GENERATE_VIDEO_PROMPT_START', payload: scene.scene_number });
        try {
            const imageUrl = asset.imageUrl;
            const mimeTypeMatch = imageUrl.match(/^data:(.*?);/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
            const base64data = imageUrl.split(',')[1];
            
            if (!base64data) {
                throw new Error("Data gambar dari visualisasi adegan tidak valid atau rusak.");
            }
    
            const sceneImage: UploadedImage = { base64: base64data, mimeType: mimeType, name: `scene_${scene.scene_number}.png` };
            const prompt = await generateCinematicVideoPrompt(scene.visual_description, sceneImage);
            dispatch({ type: 'GENERATE_VIDEO_PROMPT_SUCCESS', payload: { scene_number: scene.scene_number, prompt } });
        } catch (err) {
            dispatch({ type: 'GENERATE_VIDEO_PROMPT_ERROR', payload: scene.scene_number });
        }
    }, [sceneAssets]);

    const handleShowPrompt = useCallback((scene: Scene) => {
        const asset = sceneAssets[scene.scene_number];
        if (!asset || typeof asset.videoPrompt !== 'string') return;

        const promptObject = {
            "scene_number": scene.scene_number,
            "visual_description_for_context": scene.visual_description,
            "cinematic_prompt_for_video_model": asset.videoPrompt,
            "voiceover_script_for_this_scene": scene.voiceover_script,
        };

        const jsonString = JSON.stringify(promptObject, null, 2);
        dispatch({ type: 'SET_FIELD', payload: { field: 'promptModalContent', value: jsonString } });
    }, [sceneAssets]);

    // --- Video Modal Logic ---
    const handleOpenVideoModal = (scene: Scene) => {
        setSceneToAnimate(scene);
        setIsVideoModalOpen(true);
    };
    
    const handleVideoGenerationRequest = (scene: Scene) => {
        setSceneForVideo(scene);
        setIsFreeTierWarningOpen(true);
    };

    const proceedWithVideoGeneration = () => {
        if (sceneForVideo) {
            handleOpenVideoModal(sceneForVideo);
        }
        setIsFreeTierWarningOpen(false);
        setSceneForVideo(null);
    };

    const handleCloseVideoModal = () => {
        setIsVideoModalOpen(false);
        setSceneToAnimate(null);
        setIsGeneratingVideo(false);
        if (videoPollingRef.current) {
            clearInterval(videoPollingRef.current);
            videoPollingRef.current = null;
        }
        if (generatedVideoUrl && generatedVideoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(generatedVideoUrl);
        }
        setGeneratedVideoUrl(null);
    };

    const handleGenerateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
        if (!sceneToAnimate) return;
        const asset = sceneAssets[sceneToAnimate.scene_number];
        if (!asset || typeof asset.imageUrl !== 'string') return;

        setIsGeneratingVideo(true);
        setGeneratedVideoUrl(null);

        const messages = ["Mengirim tugas ke AI...", "AI sedang memproses video Anda...", "Menganimasikan gambar Anda...", "Menambahkan efek sinematik...", "Hampir selesai..."];
        let msgIndex = 0;
        setVideoLoadingMessage(messages[msgIndex]);
        const msgInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % messages.length;
            setVideoLoadingMessage(messages[msgIndex]);
        }, 8000);

        try {
            const imageUrl = asset.imageUrl;
            const mimeTypeMatch = imageUrl.match(/^data:(.*?);/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
            const base64data = imageUrl.split(',')[1];
            if (!base64data) throw new Error("Gagal membaca data gambar.");
            const image: UploadedImage = { base64: base64data, mimeType, name: 'scene_image.png' };

            const initialOp = await generateVideo(prompt, aspectRatio, image, false, 'veo-2.0-generate-001');

            const poll = async (op: any) => {
                try {
                    const updatedOp = await checkVideoStatus(op);
                    if (updatedOp.done) {
                        if (videoPollingRef.current) clearInterval(videoPollingRef.current);
                        videoPollingRef.current = null;
                        clearInterval(msgInterval);
                        setVideoLoadingMessage("Mengunduh video...");

                        const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if (!downloadLink) throw new Error("Operasi selesai tetapi tidak ada tautan video.");

                        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                        const videoBlob = await videoResponse.blob();
                        setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
                        setIsGeneratingVideo(false);
                    }
                } catch (pollErr) {
                    throw pollErr;
                }
            };
            
            videoPollingRef.current = window.setInterval(() => poll(initialOp), 10000);

        } catch (err) {
            clearInterval(msgInterval);
            const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
            dispatch({ type: 'GENERATE_STORYBOARD_ERROR', payload: errorMsg }); // Reuse error state
            handleCloseVideoModal();
        }
    };
    
    const isStep1Complete = !!productImage && !!productDescription;
    const isStep2Complete = isStep1Complete && workflowStep !== 'input';
    const areAllVisualsDone = storyboardResult?.mainStoryboard.scenes.every((scene: Scene) => {
        const asset = sceneAssets[scene.scene_number];
        return asset && typeof asset.imageUrl === 'string';
    }) ?? false;
    const isStep3Complete = areAllVisualsDone;

    const isVisualizingAny = Object.values(sceneAssets).some((asset: SceneAsset) => asset.imageUrl === 'loading');

    useEffect(() => {
        if (storyboardResult) {
            storyboardResult.mainStoryboard.scenes.forEach((scene: Scene) => {
                const asset = sceneAssets[scene.scene_number];
                if (asset && typeof asset.imageUrl === 'string' && asset.imageUrl !== 'error' && !asset.videoPrompt) {
                    handleGenerateVideoPrompt(scene);
                }
            });
        }
    }, [sceneAssets, storyboardResult, handleGenerateVideoPrompt]);


    const handleVisualizeAll = useCallback(async () => {
        if (!storyboardResult) return;
        for (const scene of storyboardResult.mainStoryboard.scenes) {
            if (!sceneAssets[scene.scene_number]?.imageUrl || sceneAssets[scene.scene_number]?.imageUrl === 'error') {
                 await handleVisualizeScene(scene);
            }
        }
    }, [storyboardResult, handleVisualizeScene, sceneAssets]);
    
    const handleDownloadAllVisuals = useCallback(() => {
        if (!storyboardResult) return;

        let delay = 0;
        storyboardResult.mainStoryboard.scenes.forEach((scene: Scene) => {
            const asset: SceneAsset | undefined = sceneAssets[scene.scene_number];
            if (asset && typeof asset.imageUrl === 'string') {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = asset.imageUrl as string;
                    link.download = `affiliate_scene_${scene.scene_number}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, delay);
                delay += 300;
            }
        });
    }, [storyboardResult, sceneAssets]);

    const combinedScript = useMemo(() => {
        if (!storyboardResult) return '';
        return storyboardResult.mainStoryboard.scenes
            .map((scene: Scene) => {
                const script_lines = scene.voiceover_script.split('\n');
                const cleaned_lines = script_lines.map(line => 
                    line.replace(/\([^)]*\)/g, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim()
                ).filter(line => line.length > 0);
                return cleaned_lines.join('\n');
            })
            .filter(script => script && script.trim() !== '')
            .join('\n\n');
    }, [storyboardResult]);

    const handleSendScriptToVoiceover = useCallback(() => {
        if (combinedScript) {
            sessionStorage.setItem('voiceover-studio-seed-script', combinedScript);
            onNavigateToApp('voiceover');
            dispatch({ type: 'TOGGLE_SCRIPT_MODAL' });
        } else {
            alert("Tidak ada naskah voiceover untuk dikirim.");
        }
    }, [combinedScript, onNavigateToApp]);
    
    const videoPromptAsset = isVideoModalOpen && sceneToAnimate ? sceneAssets[sceneToAnimate.scene_number]?.videoPrompt : null;
    const modalInitialPrompt =
        (videoPromptAsset && videoPromptAsset !== 'loading' && videoPromptAsset !== 'error' && typeof videoPromptAsset === 'string')
        ? videoPromptAsset
        : (sceneToAnimate?.visual_description || '');
        
    const handleSaveCustomOutfit = (description: string) => {
        dispatch({ type: 'SET_FIELD', payload: { field: 'customOutfit', value: description } });
        dispatch({ type: 'SET_DIRECTION', payload: { field: 'outfit', value: 'Kustom' } });
        setIsCustomOutfitModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">Ads Storyboard Pro</h1>
                    <button onClick={() => setIsInfoModalOpen(true)} title="Tentang & Limitasi" className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors">
                        <InfoIcon />
                    </button>
                </div>
                <p className="text-center text-gray-400 max-w-3xl mx-auto">
                    Ubah gambar produk menjadi storyboard iklan video profesional, lengkap dengan naskah, visual adegan, dan aset produksi siap pakai.
                </p>
            </div>

            <Step number={1} title="Input Aset Inti" isComplete={isStep1Complete}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Foto Produk (Wajib)</label>
                        <ImageUploader onImageUpload={(img) => dispatch({ type: 'SET_IMAGE', payload: { field: 'productImage', image: img }})} image={productImage} enableCropper={true} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Foto Model (Opsional)</label>
                        <ImageUploader onImageUpload={(img) => dispatch({ type: 'SET_IMAGE', payload: { field: 'modelImage', image: img }})} image={modelImage} enableCropper={true} />
                    </div>
                </div>
            </Step>
            
            <Step number={2} title="Arah Kreatif & Naskah" isComplete={isStep2Complete} isEnabled={isStep1Complete}>
                {workflowStep === 'input' && (
                <div className="space-y-4">
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-2 relative">
                        {isAnalyzingProduct && (
                            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center rounded-lg z-10">
                                <Loader message="Menganalisis produk..." />
                            </div>
                        )}
                        <h3 className="text-sm font-semibold text-white">Analisis Produk AI:</h3>
                        <div>
                            <label className="text-xs font-medium text-gray-400">Jenis & Merk Produk</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={e => dispatch({type: 'SET_FIELD', payload: {field: 'productName', value: e.target.value}})}
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-400">Deskripsi Detail Produk</label>
                            <textarea
                                value={productDescription}
                                onChange={e => dispatch({type: 'SET_FIELD', payload: {field: 'productDescription', value: e.target.value}})}
                                className="w-full h-24 p-2 bg-gray-700 border border-gray-600 rounded-lg text-xs"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-white mb-2 block">Ide Kreatif Tambahan (Opsional)</label>
                        <textarea
                            value={creativeIdea}
                            onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'creativeIdea', value: e.target.value } })}
                            placeholder="Contoh: Buat iklan bertema petualangan di hutan, dengan model menemukan produk ini..."
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm h-20"
                        />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-semibold text-white mb-2 block">Struktur Naskah</label>
                            <select value={creativeDirection.scriptFramework} onChange={(e) => dispatch({ type: 'SET_DIRECTION', payload: { field: 'scriptFramework', value: e.target.value } })} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm">
                                {CREATIVE_OPTIONS.scriptFramework.map(opt => <option key={opt}>{String(opt)}</option>)}
                            </select>
                        </div>
                         {/* FIX: The loop now correctly iterates over all creative options, including 'outfit' and 'lighting', and renders a select input for each. The special case for 'outfit' that caused the error is no longer needed. */}
                         {((Object.keys(CREATIVE_OPTIONS) as Array<keyof typeof CREATIVE_OPTIONS>)).filter(k => !['scriptFramework'].includes(k as string)).map((key) => {
                            const label = key === 'targetAudience' ? 'Target Audiens' : key === 'vibe' ? 'Vibe' : key.replace(/([A-Z])/g, ' $1');
                            return (
                                <div key={key}>
                                <label className="text-sm font-semibold text-white mb-2 block capitalize flex items-center gap-2">
                                     {label} {(key === 'targetAudience' || key === 'vibe') && isSuggestingDirection && <MiniSpinner />}
                                </label>
                                <select 
                                    value={creativeDirection[key as keyof typeof creativeDirection]} 
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (key === 'outfit' && value === 'Kustom') {
                                            setIsCustomOutfitModalOpen(true);
                                        } else {
                                            dispatch({ type: 'SET_DIRECTION', payload: { field: key as keyof CreativeDirection, value: e.target.value } })
                                        }
                                    }} 
                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                                >
                                    {CREATIVE_OPTIONS[key as keyof typeof CREATIVE_OPTIONS].map(opt => <option key={String(opt)}>{String(opt)}</option>)}
                                </select>
                            </div>
                            )
                        })}
                    </div>
                    {creativeDirection.targetAudience === 'Custom' && <input type="text" value={customTargetAudience} onChange={e => dispatch({type: 'SET_FIELD', payload: {field: 'customTargetAudience', value: e.target.value}})} placeholder="Target audiens kustom..." className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm" />}
                    {creativeDirection.vibe === 'Custom' && <input type="text" value={customVibe} onChange={e => dispatch({type: 'SET_FIELD', payload: {field: 'customVibe', value: e.target.value}})} placeholder="Vibe kustom..." className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm" />}

                    <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                        <SparklesIcon />
                        {isGeneratingScript ? 'Menulis Naskah...' : 'Buat Draf Naskah Voiceover'}
                    </button>
                    {isGeneratingScript && <Loader message="AI sedang merancang naskah..." />}
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>
                )}
                {workflowStep === 'script_review' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Draf Naskah Voiceover</h3>
                        <p className="text-sm text-gray-400 -mt-2">Sunting naskah di bawah ini sesuai keinginan Anda, lalu lanjutkan untuk membuat visual.</p>
                        <textarea
                            value={voiceoverScriptDraft}
                            onChange={e => dispatch({type: 'SET_FIELD', payload: { field: 'voiceoverScriptDraft', value: e.target.value }})}
                            className="w-full h-48 p-3 bg-gray-900 border border-gray-600 rounded-lg text-sm"
                        />
                        <div className="flex justify-between items-center">
                            <button onClick={() => dispatch({type: 'SET_FIELD', payload: {field: 'workflowStep', value: 'input'}})} className="text-sm font-semibold text-gray-400 hover:text-white">
                                &larr; Kembali
                            </button>
                             <button onClick={handleGenerateStoryboard} disabled={isGeneratingStoryboard} className="w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                                <SparklesIcon />
                                {isGeneratingStoryboard ? 'Membuat Visual...' : 'Buat Visual Storyboard'}
                            </button>
                        </div>
                    </div>
                )}
                {workflowStep === 'storyboard_generated' && (
                    <div className="text-center">
                        <p className="text-green-400 font-semibold">Storyboard berhasil dibuat!</p>
                        <p className="text-gray-400 text-sm">Lanjutkan ke Langkah 3 untuk memproduksi aset visual Anda.</p>
                         <button onClick={() => dispatch({type: 'RESET_STEP', payload: 'storyboard'})} className="mt-4 flex items-center justify-center gap-2 mx-auto bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-gray-600">
                           <RegenerateIcon /> Buat Ulang Naskah & Storyboard
                        </button>
                    </div>
                )}
            </Step>
            
            <AnimatePresence>
            {workflowStep === 'storyboard_generated' && storyboardResult && (
                <Step number={3} title="Produksi Aset" isComplete={isStep3Complete} isEnabled={isStep2Complete}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 -mt-2 mb-4">
                        <p className="text-sm text-gray-400">Buat gambar untuk setiap adegan di bawah ini.</p>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                           <button onClick={handleDownloadAllVisuals} disabled={Object.values(sceneAssets).every((asset: SceneAsset) => !asset.imageUrl || typeof asset.imageUrl !== 'string')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-3 rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50">
                                <DownloadIcon /> Unduh Semua Visual
                            </button>
                            <button onClick={handleVisualizeAll} disabled={isVisualizingAny} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-sm hover:bg-green-500 disabled:opacity-50">
                                <SparklesIcon /> {isVisualizingAny ? 'Memproses...' : 'Visualisasikan Semua'}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {storyboardResult?.mainStoryboard.scenes.map((scene: Scene) => (
                            <SceneCard 
                                key={scene.scene_number} 
                                scene={scene}
                                asset={sceneAssets[scene.scene_number] || { imageUrl: null, videoPrompt: null }}
                                onDescriptionChange={(newDescription) => handleSceneDescriptionChange(scene.scene_number, newDescription)}
                                onVisualize={() => handleVisualizeScene(scene)}
                                onGenerateVideoPrompt={() => handleGenerateVideoPrompt(scene)}
                                onShowPrompt={() => handleShowPrompt(scene)}
                                onGenerateVideo={() => handleVideoGenerationRequest(scene)}
                                onPreview={() => {
                                    const imageUrl = sceneAssets[scene.scene_number]?.imageUrl;
                                    if(typeof imageUrl === 'string') {
                                        dispatch({type: 'SET_FIELD', payload: {field: 'previewingImageUrl', value: imageUrl}});
                                    }
                                }}
                            />
                        ))}
                    </div>
                </Step>
            )}
            </AnimatePresence>
            
            <AnimatePresence>
            {workflowStep === 'storyboard_generated' && storyboardResult && (
                <Step number={4} title="Langkah Selanjutnya" isEnabled={isStep3Complete}>
                     <p className="text-sm text-gray-400 mb-4">Gabungkan semua naskah voiceover untuk dikirim ke Studio Voiceover.</p>
                     <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => dispatch({type: 'TOGGLE_SCRIPT_MODAL'})} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-500">
                            <VoiceoverIcon /> Gabungkan Script Voiceover jadi satu
                        </button>
                    </div>
                </Step>
            )}
            </AnimatePresence>
            
             <AnimatePresence>
                {isScriptModalOpen && (
                    <CombinedScriptModal
                        isOpen={isScriptModalOpen}
                        onClose={() => dispatch({ type: 'TOGGLE_SCRIPT_MODAL' })}
                        script={combinedScript}
                        onSend={handleSendScriptToVoiceover}
                    />
                )}
             </AnimatePresence>
             <AnimatePresence>
                {previewingImageUrl && (
                    <ScenePreviewModal 
                        imageUrl={previewingImageUrl} 
                        onClose={() => dispatch({type: 'SET_FIELD', payload: {field: 'previewingImageUrl', value: null}})} 
                    />
                )}
             </AnimatePresence>
             <AnimatePresence>
                {promptModalContent && (
                    <PromptModal
                        isOpen={!!promptModalContent}
                        onClose={() => dispatch({ type: 'SET_FIELD', payload: { field: 'promptModalContent', value: null } })}
                        title="JSON Prompt untuk Video Generator"
                        content={promptModalContent}
                    />
                )}
            </AnimatePresence>
             <AnimatePresence>
                {isVideoModalOpen && sceneToAnimate && (
                    <VideoGenerationModal
                        isOpen={isVideoModalOpen}
                        onClose={handleCloseVideoModal}
                        imageToAnimateUrl={sceneAssets[sceneToAnimate.scene_number]?.imageUrl as string}
                        initialPrompt={modalInitialPrompt}
                        onGenerate={handleGenerateVideo}
                        isLoading={isGeneratingVideo}
                        loadingMessage={videoLoadingMessage}
                        generatedVideoUrl={generatedVideoUrl}
                        sourceImageAspectRatio="1:1"
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isInfoModalOpen && (
                    <AdsStoryboardProInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
                )}
             </AnimatePresence>
             <AnimatePresence>
                {isFreeTierWarningOpen && (
                    <FreeTierVideoWarningModal
                        isOpen={isFreeTierWarningOpen}
                        onClose={() => {
                            setIsFreeTierWarningOpen(false);
                            setSceneForVideo(null);
                        }}
                        onContinue={proceedWithVideoGeneration}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isCustomOutfitModalOpen && (
                    <CustomOutfitModal
                        isOpen={isCustomOutfitModalOpen}
                        onClose={() => setIsCustomOutfitModalOpen(false)}
                        onSave={handleSaveCustomOutfit}
                        initialValue={customOutfit}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdsStoryboardPro;