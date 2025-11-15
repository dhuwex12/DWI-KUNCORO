



import React, { useCallback, useMemo, useReducer, useEffect, useState, useRef } from 'react';
import { PhotoStyle, UploadedImage, ResultData, HistorySession, ProductContext, FashionOptions, SMART_MIX_MODE } from './types';
import { STYLE_DEFINITIONS } from './types';
import { generateProductPhoto, getPromptRecommendations, identifyProduct, generateShortProductDescription, analyzeProductContext, fleshOutConcept, generateFashionOptions, generateVideo, checkVideoStatus } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import StyleSelector from './components/StyleSelector';
import ResultDisplay from './components/ResultDisplay';
import Loader from './components/Loader';
import DescriptionModal from './components/DescriptionModal';
import SessionGallery from './components/SessionGallery';
import StyloApp from './components/StyloApp';
import ProductVideoGenerator from './components/ProductVideoGenerator';
import AICopywriterPro from './components/AICopywriterPro';
import AIVoiceoverStudio from './components/AIVoiceoverStudio';
import PosterCreator from './components/PosterCreator';
import LpGeneratorPro from './components/LpGeneratorPro'; // New import
import ApiKeyModal from './components/ApiKeyModal';
import HomePage from './components/HomePage'; // Import HomePage
import ModelSettingsModal from './components/ModelSettingsModal'; // Import ModelSettingsModal
import ChatTechnician from './components/ChatTechnician'; // Import the new chat app
import ReadMePage from './components/ReadMePage'; // Import the new readme page
import { SparklesIcon } from './components/icons/SparklesIcon';
import { LightbulbIcon } from './components/icons/LightbulbIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { ChevronDownIcon } from './components/icons/ChevronDownIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { UserFocusIcon } from './components/icons/UserFocusIcon';
import { KeyIcon } from './components/icons/KeyIcon';
import { SettingsIcon } from './components/icons/SettingsIcon'; // Import SettingsIcon
import { LpGeneratorIcon } from './components/icons/LpGeneratorIcon'; // New import
import HistoryDisplay from './components/HistoryDisplay';
import { CloseIcon } from './components/icons/CloseIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import AdsStoryboardPro from './components/AIAffiliator';
import { MarketoIcon } from './components/icons/MarketoIcon';
import { CameraIcon } from './components/icons/CameraIcon';
import { AffiliateIcon } from './components/icons/AffiliateIcon';
import { VideoGeneratorIcon } from './components/icons/VideoGeneratorIcon';
import { CopywriterIcon } from './components/icons/CopywriterIcon';
import { VoiceoverIcon } from './components/icons/VoiceoverIcon';
import { PosterIcon } from './components/icons/PosterIcon';
import VideoGenerationModal from './components/VideoGenerationModal';
import FreeTierVideoWarningModal from './components/FreeTierVideoWarningModal';


// --- History Preview Modal ---
const HistoryPreviewModal: React.FC<{ session: HistorySession | null; onClose: () => void }> = ({ session, onClose }) => {
    if (!session) return null;

    const handleDownloadAll = () => {
        session.results.forEach((result, index) => {
            const link = document.createElement('a');
            link.href = result.imageUrl; // This will be the thumbnail URL
            const styleName = String(result.style).toLowerCase();
            link.download = `history-thumbnail-${session.id}-${index + 1}-${styleName}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pratinjau Riwayat Sesi</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sesi dari {new Date(session.timestamp).toLocaleString('id-ID')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                <div className="overflow-y-auto flex-grow pr-2 -mr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {session.results.map((result, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={result.imageUrl}
                                    alt={`Hasil foto ${index + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg"
                                />
                                <a
                                    href={result.imageUrl}
                                    download={`history-thumbnail-${session.id}-${index}.jpg`}
                                    className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Unduh Thumbnail"
                                >
                                    <DownloadIcon />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-6 flex-shrink-0 flex justify-between items-center">
                    <p className="text-xs text-gray-500">Catatan: Gambar yang diunduh adalah thumbnail berkualitas rendah.</p>
                    <button
                        onClick={handleDownloadAll}
                        className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-green-500"
                    >
                        <DownloadIcon /> Unduh Semua Thumbnail
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


// --- State, Reducer, and Actions for Photography App ---

export interface AppState {
  uploadedImage: UploadedImage | null;
  productDescription: string;
  selectedStyle: PhotoStyle | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  results: ResultData[];
  regeneratingIndices: Set<number>;
  numberOfImages: number;
  customPrompts: string[];
  userConcept: string; // Ditambahkan
  negativePrompt: string;
  isRecommending: boolean;
  showPromptTips: boolean;
  isDescriptionModalOpen: boolean;
  identifiedProductName: string;
  isIdentifying: boolean;
  isGeneratingDescription: boolean;
  history: HistorySession[];
  
  // New state for Fashion Mode
  fashionOptions: FashionOptions | null;
  isGeneratingFashionOptions: boolean;
  selectedFashionModelStyle: string;
  selectedFashionBackground: string;
  selectedFashionShotType: string;

  // New state for Reference Background
  referenceBackgroundImage: UploadedImage | null;
}

const initialState: AppState = {
  uploadedImage: null,
  productDescription: '',
  selectedStyle: null,
  isLoading: false,
  loadingMessage: 'AI sedang bekerja...',
  error: null,
  results: [],
  regeneratingIndices: new Set(),
  numberOfImages: 1,
  customPrompts: [''],
  userConcept: '', // Ditambahkan
  negativePrompt: '',
  isRecommending: false,
  showPromptTips: false,
  isDescriptionModalOpen: false,
  identifiedProductName: '',
  isIdentifying: false,
  isGeneratingDescription: false,
  history: [],

  // Initial state for Fashion Mode
  fashionOptions: null,
  isGeneratingFashionOptions: false,
  selectedFashionModelStyle: '',
  selectedFashionBackground: '',
  selectedFashionShotType: '',

  // Initial state for Reference Background
  referenceBackgroundImage: null,
};

type AppAction =
  | { type: 'UPLOAD_IMAGE'; payload: UploadedImage | null }
  | { type: 'UPLOAD_REFERENCE_BACKGROUND'; payload: UploadedImage | null }
  | { type: 'SAVE_DESCRIPTION'; payload: string }
  | { type: 'SELECT_STYLE'; payload: PhotoStyle | null }
  | { type: 'SET_NUMBER_OF_IMAGES'; payload: number }
  | { type: 'UPDATE_CUSTOM_PROMPT'; payload: { index: number; value: string } }
  | { type: 'SET_CUSTOM_PROMPTS'; payload: string[] }
  | { type: 'SET_USER_CONCEPT'; payload: string } // Ditambahkan
  | { type: 'SET_NEGATIVE_PROMPT'; payload: string }
  | { type: 'TOGGLE_PROMPT_TIPS' }
  | { type: 'GET_RECOMMENDATIONS_START' }
  | { type: 'GET_RECOMMENDATIONS_SUCCESS'; payload: string[] }
  | { type: 'GET_RECOMMENDATIONS_ERROR'; payload: string }
  | { type: 'GENERATE_START' }
  | { type: 'SET_LOADING_MESSAGE'; payload: string }
  | { type: 'GENERATE_SUCCESS'; payload: ResultData[] }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'REGENERATE_START'; payload: number }
  | { type: 'REGENERATE_SUCCESS'; payload: { index: number; imageUrl: string } }
  | { type: 'REGENERATE_ERROR'; payload: { index: number; error: string } }
  | { type: 'START_OVER' }
  | { type: 'OPEN_DESCRIPTION_MODAL' }
  | { type: 'CLOSE_DESCRIPTION_MODAL' }
  | { type: 'USE_AS_INPUT_START' }
  | { type: 'USE_AS_INPUT_SUCCESS'; payload: UploadedImage }
  | { type: 'IDENTIFY_PRODUCT_START' }
  | { type: 'IDENTIFY_PRODUCT_SUCCESS'; payload: string }
  | { type: 'IDENTIFY_PRODUCT_ERROR'; payload: string }
  | { type: 'GENERATE_DESCRIPTION_START' }
  | { type: 'GENERATE_DESCRIPTION_SUCCESS'; payload: string }
  | { type: 'GENERATE_DESCRIPTION_ERROR'; payload: string }
  | { type: 'ADD_SESSION_TO_HISTORY'; payload: HistorySession }
  | { type: 'LOAD_HISTORY'; payload: HistorySession[] }
  // New actions for Photography App
  | { type: 'UPDATE_VIDEO_PROMPT'; payload: { index: number; prompt: string } }
  | { type: 'UPDATE_PROMO_SCRIPT'; payload: { index: number; script: string } }
  // New actions for Fashion Mode
  | { type: 'GENERATE_FASHION_OPTIONS_START' }
  | { type: 'GENERATE_FASHION_OPTIONS_SUCCESS'; payload: FashionOptions }
  | { type: 'GENERATE_FASHION_OPTIONS_ERROR'; payload: string }
  | { type: 'SET_FASHION_SELECTION'; payload: { field: 'selectedFashionModelStyle' | 'selectedFashionBackground' | 'selectedFashionShotType'; value: string } };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'UPLOAD_IMAGE':
      return {
        ...state,
        uploadedImage: action.payload,
        results: [],
        error: null,
        selectedStyle: action.payload ? state.selectedStyle : null,
        productDescription: action.payload ? state.productDescription : '',
        identifiedProductName: '',
        isIdentifying: false,
        isGeneratingDescription: false,
        isDescriptionModalOpen: false,
        fashionOptions: null, // Reset fashion options on new upload
        referenceBackgroundImage: null, // Reset reference background on new upload
      };
    case 'UPLOAD_REFERENCE_BACKGROUND':
        return { ...state, referenceBackgroundImage: action.payload };
    case 'SAVE_DESCRIPTION':
      return { ...state, productDescription: action.payload, isDescriptionModalOpen: false };
    case 'SELECT_STYLE':
      return {
        ...state,
        selectedStyle: action.payload,
        results: [],
        error: null,
        fashionOptions: action.payload === PhotoStyle.ModeFashion ? state.fashionOptions : null, // Reset if not fashion mode
        referenceBackgroundImage: action.payload === PhotoStyle.ReferenceBackground ? state.referenceBackgroundImage : null, // Reset if not reference mode
      };
    case 'SET_NUMBER_OF_IMAGES': {
        // Only adjust customPrompts if the selected style is Smart
        if (state.selectedStyle === PhotoStyle.Smart) {
            const newPrompts = Array(action.payload).fill('');
            for (let i = 0; i < Math.min(state.customPrompts.length, action.payload); i++) {
                newPrompts[i] = state.customPrompts[i];
            }
            return { ...state, numberOfImages: action.payload, customPrompts: newPrompts };
        }
        return { ...state, numberOfImages: action.payload };
    }
    case 'UPDATE_CUSTOM_PROMPT': {
        const newPrompts = [...state.customPrompts];
        newPrompts[action.payload.index] = action.payload.value;
        return { ...state, customPrompts: newPrompts };
    }
    case 'SET_CUSTOM_PROMPTS':
      return { ...state, customPrompts: action.payload };
    case 'SET_USER_CONCEPT': // Ditambahkan
      return { ...state, userConcept: action.payload };
    case 'SET_NEGATIVE_PROMPT':
      return { ...state, negativePrompt: action.payload };
    case 'TOGGLE_PROMPT_TIPS':
      return { ...state, showPromptTips: !state.showPromptTips };
    case 'GET_RECOMMENDATIONS_START':
      return { ...state, isRecommending: true, error: null };
    case 'GET_RECOMMENDATIONS_SUCCESS':
      return { ...state, isRecommending: false, customPrompts: action.payload };
    case 'GET_RECOMMENDATIONS_ERROR':
      return { ...state, isRecommending: false, error: `Gagal mendapatkan rekomendasi. ${action.payload}` };
    case 'GENERATE_START':
      return { ...state, isLoading: true, error: null, results: [] };
    case 'SET_LOADING_MESSAGE':
      return { ...state, loadingMessage: action.payload };
    case 'GENERATE_SUCCESS':
      return { ...state, isLoading: false, results: action.payload };
    case 'GENERATE_ERROR':
      return { ...state, isLoading: false, error: `Gagal membuat gambar. ${action.payload}` };
    case 'REGENERATE_START': {
        const newSet = new Set(state.regeneratingIndices);
        newSet.add(action.payload);
        return { ...state, regeneratingIndices: newSet, error: null };
    }
    case 'REGENERATE_SUCCESS': {
        const newResults = [...state.results];
        newResults[action.payload.index] = { ...newResults[action.payload.index], imageUrl: action.payload.imageUrl };
        const newSet = new Set(state.regeneratingIndices);
        newSet.delete(action.payload.index);
        return { ...state, results: newResults, regeneratingIndices: newSet };
    }
     case 'REGENERATE_ERROR': {
        const newSet = new Set(state.regeneratingIndices);
        newSet.delete(action.payload.index);
        return { ...state, error: `Gagal membuat ulang. ${action.payload.error}`, regeneratingIndices: newSet };
    }
    case 'START_OVER':
      return { ...initialState, history: state.history };
    case 'OPEN_DESCRIPTION_MODAL':
      return { ...state, isDescriptionModalOpen: true };
    case 'CLOSE_DESCRIPTION_MODAL':
      return { ...state, isDescriptionModalOpen: false };
    case 'USE_AS_INPUT_START':
      return { ...initialState, history: state.history, uploadedImage: { base64: '', mimeType: '', name: 'Gambar Hasil AI' } };
    case 'USE_AS_INPUT_SUCCESS':
        return { 
            ...initialState, 
            history: state.history,
            uploadedImage: action.payload,
            productDescription: "Gambar yang dihasilkan AI. (Anda bisa mengubah deskripsi ini)",
            isDescriptionModalOpen: true
        };
    case 'IDENTIFY_PRODUCT_START':
      return { ...state, isIdentifying: true, identifiedProductName: '', productDescription: 'AI sedang mengidentifikasi produk...' };
    case 'IDENTIFY_PRODUCT_SUCCESS':
      return { ...state, isIdentifying: false, identifiedProductName: action.payload, productDescription: action.payload };
    case 'IDENTIFY_PRODUCT_ERROR':
      console.error("Product identification error:", action.payload);
      return { ...state, isIdentifying: false, identifiedProductName: '', productDescription: 'Gagal mengidentifikasi. Tambahkan deskripsi manual.' };
    case 'GENERATE_DESCRIPTION_START':
      return { ...state, isGeneratingDescription: true };
    case 'GENERATE_DESCRIPTION_SUCCESS': {
      const newDescription = `${state.identifiedProductName}. ${action.payload}`;
      return { ...state, isGeneratingDescription: false, productDescription: newDescription };
    }
    case 'GENERATE_DESCRIPTION_ERROR':
      return { ...state, isGeneratingDescription: false, error: `Gagal membuat deskripsi. ${action.payload}` };
    case 'ADD_SESSION_TO_HISTORY':
      const newHistory = [action.payload, ...state.history].slice(0, 10);
      return { ...state, history: newHistory };
    case 'LOAD_HISTORY':
      return { ...state, history: action.payload };
    case 'UPDATE_VIDEO_PROMPT': {
        const newResults = [...state.results];
        if (newResults[action.payload.index]) {
            newResults[action.payload.index] = { ...newResults[action.payload.index], videoPrompt: action.payload.prompt };
        }
        return { ...state, results: newResults };
    }
    case 'UPDATE_PROMO_SCRIPT': {
        const newResults = [...state.results];
        if (newResults[action.payload.index]) {
            newResults[action.payload.index] = { ...newResults[action.payload.index], promoScript: action.payload.script };
        }
        return { ...state, results: newResults };
    }
    // Reducers for Fashion Mode
    case 'GENERATE_FASHION_OPTIONS_START':
      return { ...state, isGeneratingFashionOptions: true, fashionOptions: null, error: null };
    case 'GENERATE_FASHION_OPTIONS_SUCCESS':
      const opts = action.payload;
      return {
        ...state,
        isGeneratingFashionOptions: false,
        fashionOptions: opts,
        selectedFashionModelStyle: SMART_MIX_MODE,
        selectedFashionBackground: SMART_MIX_MODE,
        selectedFashionShotType: SMART_MIX_MODE,
      };
    case 'GENERATE_FASHION_OPTIONS_ERROR':
      return { ...state, isGeneratingFashionOptions: false, error: `Gagal mendapatkan opsi fashion. ${action.payload}` };
    case 'SET_FASHION_SELECTION':
      return { ...state, [action.payload.field]: action.payload.value };
    default:
      return state;
  }
}

// Helper function to create a thumbnail from a data URL
const createThumbnail = (dataUrl: string, size = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const aspectRatio = img.width / img.height;
            if (aspectRatio > 1) { // landscape
                canvas.width = size;
                canvas.height = size / aspectRatio;
            } else { // portrait or square
                canvas.height = size;
                canvas.width = size * aspectRatio;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context not available'));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for smaller size, 80% quality
        };
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
    });
};

// --- Photography Specialist App Component ---

function initStateFromSession(initial: AppState): AppState {
    let sessionState = { ...initial };
    try {
        const storedSession = sessionStorage.getItem('ai-photo-session');
        if (storedSession) {
            const parsed = JSON.parse(storedSession);
            delete parsed.results;
            delete parsed.history;
            sessionState = { ...sessionState, ...parsed, regeneratingIndices: new Set(), isLoading: false, isRecommending: false, error: null };
        }
        
        const storedHistory = localStorage.getItem('ai-photo-history');
        if (storedHistory) {
            const parsedHistory = JSON.parse(storedHistory);
            if(Array.isArray(parsedHistory)) {
                sessionState.history = parsedHistory;
            }
        }
    } catch (e) {
        console.error("Gagal mengurai status sesi atau riwayat:", e);
        sessionStorage.removeItem('ai-photo-session');
        localStorage.removeItem('ai-photo-history');
    }
    return sessionState;
}

const NumberSelector: React.FC<{ value: number; onChange: (value: number) => void; max?: number; }> = ({ value, onChange, max = 10 }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah Gambar</label>
        <div className="flex flex-wrap gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map(num => (
                <button
                    key={num}
                    onClick={() => onChange(num)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-sm transition-all border-2 transform hover:-translate-y-1 ${
                        value === num
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    aria-pressed={value === num}
                    aria-label={`Hasilkan ${num} gambar`}
                >
                    {num}
                </button>
            ))}
        </div>
    </div>
);

const PhotographySpecialistApp: React.FC<{ onNavigateToApp: (appId: string) => void }> = ({ onNavigateToApp }) => {
  const [state, dispatch] = useReducer(appReducer, initialState, initStateFromSession);
  const { 
    uploadedImage, productDescription, selectedStyle, isLoading, loadingMessage,
    error, results, regeneratingIndices, numberOfImages, customPrompts, userConcept,
    negativePrompt, isRecommending, showPromptTips, isDescriptionModalOpen,
    identifiedProductName, isIdentifying, isGeneratingDescription, history,
    fashionOptions, isGeneratingFashionOptions, selectedFashionModelStyle,
    selectedFashionBackground, selectedFashionShotType, referenceBackgroundImage
  } = state;
  const [historyPreview, setHistoryPreview] = useState<HistorySession | null>(null);

  // --- Video Generation State & Logic ---
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isFreeTierWarningOpen, setIsFreeTierWarningOpen] = useState(false);
  const [videoToGenerate, setVideoToGenerate] = useState<ResultData | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const videoPollingRef = useRef<number | null>(null);


  const handleUpdateVideoPrompt = useCallback((index: number, prompt: string) => {
    dispatch({ type: 'UPDATE_VIDEO_PROMPT', payload: { index, prompt } });
  }, []);

  const handleUpdatePromoScript = useCallback((index: number, script: string) => {
    dispatch({ type: 'UPDATE_PROMO_SCRIPT', payload: { index, script } });
  }, []);

  const handleVideoGenerationRequest = useCallback((result: ResultData) => {
    setVideoToGenerate(result);
    setIsFreeTierWarningOpen(true);
  }, []);

  const proceedWithVideoGeneration = useCallback(() => {
    if (videoToGenerate) {
      setIsVideoModalOpen(true);
    }
    setIsFreeTierWarningOpen(false);
  }, [videoToGenerate]);

  const handleCloseVideoModal = useCallback(() => {
    setIsVideoModalOpen(false);
    setVideoToGenerate(null);
    setIsGeneratingVideo(false);
    if (videoPollingRef.current) {
        clearInterval(videoPollingRef.current);
        videoPollingRef.current = null;
    }
    if (generatedVideoUrl && generatedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedVideoUrl);
    }
    setGeneratedVideoUrl(null);
  }, [generatedVideoUrl]);

  const handleGenerateVideo = useCallback(async (prompt: string, aspectRatio: '16:9' | '9:16') => {
    if (!videoToGenerate) return;

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
        const imageUrl = videoToGenerate.imageUrl;
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
                    if (!videoResponse.ok) throw new Error(`Gagal mengunduh video: ${videoResponse.statusText}`);
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
        dispatch({ type: 'GENERATE_ERROR', payload: errorMsg });
        handleCloseVideoModal();
    }
  }, [videoToGenerate, handleCloseVideoModal]);


  useEffect(() => {
    const stateToStore = {
        uploadedImage,
        productDescription,
        selectedStyle,
        numberOfImages,
        customPrompts,
        userConcept,
        negativePrompt,
        // fashion state
        fashionOptions,
        selectedFashionModelStyle,
        selectedFashionBackground,
        selectedFashionShotType,
        referenceBackgroundImage,
    };
    sessionStorage.setItem('ai-photo-session', JSON.stringify(stateToStore));
  }, [uploadedImage, productDescription, selectedStyle, numberOfImages, customPrompts, userConcept, negativePrompt, fashionOptions, selectedFashionModelStyle, selectedFashionBackground, selectedFashionShotType, referenceBackgroundImage]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-photo-history', JSON.stringify(history));
    } catch (e) {
      console.error("Gagal menyimpan riwayat ke localStorage:", e);
    }
  }, [history]);
  
  useEffect(() => {
    if (uploadedImage && uploadedImage.mimeType && !identifiedProductName && !isIdentifying) {
        const doIdentify = async () => {
            dispatch({ type: 'IDENTIFY_PRODUCT_START' });
            try {
                // FIX: Ensure mimeType is not empty before making the call
                if (uploadedImage.mimeType) {
                    const name = await identifyProduct(uploadedImage);
                    dispatch({ type: 'IDENTIFY_PRODUCT_SUCCESS', payload: name });
                } else {
                    throw new Error("Tipe MIME gambar tidak valid.");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Gagal mengidentifikasi produk.';
                dispatch({ type: 'IDENTIFY_PRODUCT_ERROR', payload: errorMessage });
            }
        };
        doIdentify();
    }
  }, [uploadedImage, identifiedProductName, isIdentifying]);

  useEffect(() => {
    if (selectedStyle === PhotoStyle.ModeFashion && uploadedImage && identifiedProductName && !fashionOptions && !isGeneratingFashionOptions) {
        const getOptions = async () => {
            dispatch({ type: 'GENERATE_FASHION_OPTIONS_START' });
            try {
                const options = await generateFashionOptions(uploadedImage, identifiedProductName);
                dispatch({ type: 'GENERATE_FASHION_OPTIONS_SUCCESS', payload: options });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan.';
                dispatch({ type: 'GENERATE_FASHION_OPTIONS_ERROR', payload: errorMessage });
            }
        };
        getOptions();
    }
  }, [selectedStyle, uploadedImage, identifiedProductName, fashionOptions, isGeneratingFashionOptions]);

  const isGenerationDisabled = useMemo(() => {
    if (isLoading || !uploadedImage || !selectedStyle) return true;
    if (selectedStyle === PhotoStyle.Smart) {
        return customPrompts.every(p => p.trim() === '');
    }
    if (selectedStyle === PhotoStyle.KonsepKustom) {
        return userConcept.trim() === '';
    }
    if (selectedStyle === PhotoStyle.ModeFashion) {
        return !fashionOptions || isGeneratingFashionOptions;
    }
    if (selectedStyle === PhotoStyle.ReferenceBackground) {
        return !referenceBackgroundImage;
    }
    return false;
  }, [uploadedImage, selectedStyle, isLoading, customPrompts, userConcept, fashionOptions, isGeneratingFashionOptions, referenceBackgroundImage]);
  
  const handleImageUpload = useCallback((image: UploadedImage | null) => {
    dispatch({ type: 'UPLOAD_IMAGE', payload: image });
  }, []);

  const handleReferenceBackgroundUpload = useCallback((image: UploadedImage | null) => {
    dispatch({ type: 'UPLOAD_REFERENCE_BACKGROUND', payload: image });
  }, []);

  const handleSaveDescription = useCallback((description: string) => {
    dispatch({ type: 'SAVE_DESCRIPTION', payload: description });
  }, []);
  
  const handleGenerateAIDescription = useCallback(async () => {
    if (!identifiedProductName || isGeneratingDescription) return;
    dispatch({ type: 'GENERATE_DESCRIPTION_START' });
    try {
        const description = await generateShortProductDescription(identifiedProductName);
        dispatch({ type: 'GENERATE_DESCRIPTION_SUCCESS', payload: description });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal membuat deskripsi.';
        dispatch({ type: 'GENERATE_DESCRIPTION_ERROR', payload: errorMessage });
    }
  }, [identifiedProductName, isGeneratingDescription]);

  const handleStyleSelect = useCallback((style: PhotoStyle) => {
    dispatch({ type: 'SELECT_STYLE', payload: style });
  }, []);

  const handleCustomPromptChange = (index: number, value: string) => {
    dispatch({ type: 'UPDATE_CUSTOM_PROMPT', payload: { index, value } });
  };
  
  const handleGetRecommendations = async () => {
    if (!uploadedImage) return;
    dispatch({ type: 'GET_RECOMMENDATIONS_START' });
    try {
      const recommendations = await getPromptRecommendations(
        uploadedImage, productDescription, numberOfImages
      );
      dispatch({ type: 'GET_RECOMMENDATIONS_SUCCESS', payload: recommendations });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      dispatch({ type: 'GET_RECOMMENDATIONS_ERROR', payload: errorMessage });
    }
  };
  
  const getPrompts = async (): Promise<string[]> => {
    if (!uploadedImage || !selectedStyle) return [];

    if (selectedStyle === PhotoStyle.ModeFashion) {
        if (!fashionOptions) return [];

        const isModelMixed = selectedFashionModelStyle === SMART_MIX_MODE;
        const isBackgroundMixed = selectedFashionBackground === SMART_MIX_MODE;
        const isShotTypeMixed = selectedFashionShotType === SMART_MIX_MODE;
        const allMixed = isModelMixed && isBackgroundMixed && isShotTypeMixed;

        let prompt = `You are a world-class AI fashion photographer. Create a professional, photorealistic commercial image.\n- Product: The model should be wearing or using the product from the input image, identified as "${identifiedProductName}".\n`;

        if (allMixed) {
            prompt += `You have full artistic freedom to create the most impactful image. Here is a palette of ideas for inspiration:\n`;
            prompt += `- Possible Model Styles: [${fashionOptions.modelStyles.join(', ')}]\n`;
            prompt += `- Possible Backgrounds: [${fashionOptions.backgrounds.join(', ')}]\n`;
            prompt += `- Possible Shot Types: [${fashionOptions.shotTypes.join(', ')}]\n`;
            prompt += `Combine these elements creatively to produce the best result.`;
        } else {
            // Model Style
            if (isModelMixed) {
                prompt += `- Model: You have creative freedom. Choose the most fitting model style from this list: [${fashionOptions.modelStyles.join(', ')}].\n`;
            } else {
                prompt += `- Model: A model with a "${selectedFashionModelStyle}" style.\n`;
            }
            // Background
            if (isBackgroundMixed) {
                prompt += `- Background: You have creative freedom. Choose the most fitting background from this list: [${fashionOptions.backgrounds.join(', ')}].\n`;
            } else {
                prompt += `- Background: The background is a "${selectedFashionBackground}".\n`;
            }
            // Shot Type
            if (isShotTypeMixed) {
                prompt += `- Composition: You have creative freedom. Choose the most fitting composition from this list: [${fashionOptions.shotTypes.join(', ')}].\n`;
            } else {
                prompt += `- Composition: Use a "${selectedFashionShotType}" composition.\n`;
            }
        }
        prompt += `\nThe final image must be of magazine quality, highly detailed, and aesthetically pleasing.`;
        return Array(numberOfImages).fill(prompt);
    }
    
    if (selectedStyle === PhotoStyle.KonsepKustom) {
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'AI sedang mengembangkan konsep Anda...' });
        return await fleshOutConcept(uploadedImage, productDescription, userConcept, numberOfImages);
    }
    
    if (selectedStyle === PhotoStyle.Smart) {
        return customPrompts.filter(p => p.trim() !== '');
    }
    
    let finalStyleDef = { ...STYLE_DEFINITIONS[selectedStyle] };
    let context: Partial<ProductContext> | null = null;
    const targetedStyles: PhotoStyle[] = [PhotoStyle.Minimalis, PhotoStyle.Lifestyle, PhotoStyle.Dinamis, PhotoStyle.NaturalOrganik];

    if (targetedStyles.includes(selectedStyle)) {
        try {
            dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Menganalisis konteks produk...' });
            context = await analyzeProductContext(uploadedImage, selectedStyle);
        } catch (err) {
            console.error(err instanceof Error ? err.message : 'Gagal menganalisis konteks produk. Menggunakan latar generik.');
        }
    }

    const templateInfo = finalStyleDef.promptTemplate;
    if (!templateInfo) {
        return Array(numberOfImages).fill(finalStyleDef.prompt || '');
    }

    const dynamicModifiers = { ...templateInfo.modifiers };
    
    if (context) {
        if (selectedStyle === PhotoStyle.Minimalis && context.relevantSurfaces?.length) {
            dynamicModifiers.SURFACE = context.relevantSurfaces;
        }
        if (selectedStyle === PhotoStyle.NaturalOrganik && context.relevantSurfaces?.length) {
            dynamicModifiers.PERMUKAAN_ALAMI = context.relevantSurfaces;
        }
        if (selectedStyle === PhotoStyle.Lifestyle && context.relevantSettings?.length) {
            dynamicModifiers.SETTING = context.relevantSettings;
        }
        if (selectedStyle === PhotoStyle.Dinamis && context.relevantActions?.length) {
            dynamicModifiers.ACTION = context.relevantActions;
        }
    }

    return Array.from({ length: numberOfImages }, (_, i) => {
        let prompt = templateInfo.template;
        Object.keys(dynamicModifiers).forEach(key => {
            const values = dynamicModifiers[key];
            if (values?.length > 0) {
                // Use a different value for each image to increase variety
                const valueIndex = i % values.length;
                const selectedValue = values[valueIndex];
                prompt = prompt.replace(`[${key.toUpperCase()}]`, selectedValue);
            }
        });
        return prompt;
    });
};


  const handleGenerate = async () => {
    if (isGenerationDisabled || !uploadedImage || !selectedStyle) return;
    dispatch({ type: 'GENERATE_START' });
    
    const messages = ["Menganalisis gambar Anda...","Membangun konsep kreatif...","Menyesuaikan pencahayaan...","Memberikan sentuhan akhir...","Hampir selesai..."];
    let messageIndex = 0;
    const intervalId = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: messages[messageIndex] });
    }, 2500);

    try {
      let generationTasks: Promise<{ imageUrl: string; prompt: string; style: PhotoStyle; }>[] = [];

      if (selectedStyle === PhotoStyle.ReferenceBackground) {
        if (!referenceBackgroundImage) throw new Error("Gambar latar belakang referensi hilang.");
        const prompt = `Critically analyze the first image, which contains a product. Then, analyze the second image, which is a reference for the background, style, and lighting.
Your task is to place the product from the first image seamlessly and photorealistically into a scene that perfectly matches the aesthetic, environment, and lighting of the second image. The final output must be a single, high-quality commercial photograph. Do not include the original product's background.`;
        
        generationTasks = Array.from({ length: numberOfImages }).map(() =>
            generateProductPhoto(uploadedImage, prompt, referenceBackgroundImage)
                .then(response => ({ imageUrl: response.imageUrl, prompt, style: selectedStyle }))
        );
      } else {
        const basePrompts = await getPrompts();
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: messages[0] });

        const promptsToRun = basePrompts.map(p => {
            const trimmedNegative = negativePrompt.trim();
            return trimmedNegative ? `${p.trim()}. Hal-hal yang harus dihindari: ${trimmedNegative}` : p.trim();
        });
        
        if (promptsToRun.length === 0) {
            throw new Error("Silakan berikan setidaknya satu prompt atau konsep.");
        }
        
        generationTasks = promptsToRun.map(prompt =>
            generateProductPhoto(uploadedImage, prompt)
            .then(response => ({ imageUrl: response.imageUrl, prompt, style: selectedStyle }))
        );
      }

        const newResults = await Promise.all(generationTasks);
        dispatch({ type: 'GENERATE_SUCCESS', payload: newResults });

        // Thumbnail creation for history
        try {
            const originalImageAsDataUrl = `data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`;
            const originalThumbUrl = await createThumbnail(originalImageAsDataUrl);
            const [originalThumbHeader, originalThumbBase64] = originalThumbUrl.split(',');
            const originalThumbMime = originalThumbHeader.match(/:(.*?);/)?.[1] || 'image/jpeg';

            const resultThumbnails = await Promise.all(
                newResults.map(async (result) => ({ ...result, imageUrl: await createThumbnail(result.imageUrl) }))
            );

            dispatch({ type: 'ADD_SESSION_TO_HISTORY', payload: {
                id: `session-${Date.now()}`,
                timestamp: Date.now(),
                originalImage: { name: uploadedImage.name, base64: originalThumbBase64, mimeType: originalThumbMime },
                results: resultThumbnails,
                productDescription,
                selectedStyle,
            }});
        } catch (thumbError) {
            console.error("Gagal membuat thumbnail untuk riwayat:", thumbError);
        }
        
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      dispatch({ type: 'GENERATE_ERROR', payload: errorMessage });
    } finally {
      clearInterval(intervalId);
    }
  };
  
  const handleRegenerate = async (index: number) => {
    const resultToRegen = results[index];
    if (!resultToRegen || !uploadedImage) return;
    dispatch({ type: 'REGENERATE_START', payload: index });
    try {
      let response;
      if (resultToRegen.style === PhotoStyle.ReferenceBackground) {
        response = await generateProductPhoto(uploadedImage, resultToRegen.prompt, referenceBackgroundImage);
      } else {
        response = await generateProductPhoto(uploadedImage, resultToRegen.prompt);
      }
      dispatch({ type: 'REGENERATE_SUCCESS', payload: { index, imageUrl: response.imageUrl } });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
        dispatch({ type: 'REGENERATE_ERROR', payload: { index, error: errorMessage } });
    }
  };

  const handleStartOver = () => {
    dispatch({ type: 'START_OVER' });
  };

  const handleUseAsInput = useCallback(async (imageUrl: string) => {
    if (!imageUrl.startsWith('data:')) {
      dispatch({ type: 'GENERATE_ERROR', payload: "Gagal menggunakan gambar: URL tidak valid." });
      return;
    }
    dispatch({ type: 'USE_AS_INPUT_START' });
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          dispatch({ type: 'USE_AS_INPUT_SUCCESS', payload: {
            base64: base64String, mimeType: blob.type, name: `generated_image_${Date.now()}.png`
          }});
        } else { throw new Error("Tidak dapat membaca data gambar."); }
      };
      reader.onerror = () => { throw new Error("Kesalahan pembaca file."); }
      reader.readAsDataURL(blob);
    } catch(err) {
      console.error("Gagal menggunakan gambar sebagai input:", err);
      dispatch({ type: 'GENERATE_ERROR', payload: "Gagal memproses gambar sebagai input baru." });
    }
  }, []);

  const handleDownloadAll = () => {
    results.forEach((result, index) => {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      const safePrompt = result.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const styleName = result.style ? String(result.style).toLowerCase() : 'custom';
      link.download = `ai-product-photo-${index + 1}-${styleName}-${safePrompt}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const renderCustomPromptUI = () => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-4 flex flex-col gap-4"
    >
        <NumberSelector
            value={numberOfImages}
            onChange={(num) => dispatch({ type: 'SET_NUMBER_OF_IMAGES', payload: num })}
        />
        <button
            onClick={handleGetRecommendations} disabled={isRecommending || !uploadedImage}
            className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2 px-3 rounded-lg text-sm transition-all hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <LightbulbIcon />
            {isRecommending ? 'Mendapatkan Rekomendasi...' : 'Dapatkan Rekomendasi Prompt AI'}
        </button>
        <div className="bg-gray-100 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <button onClick={() => dispatch({ type: 'TOGGLE_PROMPT_TIPS' })} className="w-full flex justify-between items-center text-left group">
                <div className="flex items-center gap-2">
                    <InfoIcon />
                    <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Tips Menulis Prompt Efektif</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showPromptTips ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
            {showPromptTips && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <div className="mt-3 pl-7 text-sm text-gray-500 dark:text-gray-400 space-y-2 pt-2">
                        <p>• <strong>Spesifik:</strong> Jelaskan detail produk, latar belakang, dan pencahayaan. Hindari prompt yang ambigu.</p>
                        <p>• <strong>Gunakan Kata Sifat:</strong> Tambahkan kata seperti "Mewah", "hangat", "modern", atau "minimalis" untuk mengatur nuansa.</p>
                        <p>• <strong>Sebutkan Mood:</strong> Coba "Suasana pagi yang cerah" atau "pencahayaan dramatis malam hari".</p>
                        <p>• <strong>Contoh:</strong> "Foto produk parfum di atas pasir basah saat matahari terbenam, dengan percikan air di sekitarnya."</p>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
        <div className="space-y-3">
            {customPrompts.map((prompt, index) => (
                <div key={index}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Prompt Kustom #{index + 1}</label>
                     <textarea
                        value={prompt} onChange={(e) => handleCustomPromptChange(index, e.target.value)}
                        placeholder="Contoh: Foto produk di atas meja marmer dengan bayangan dedaunan tropis..."
                        className="w-full h-24 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" rows={3}
                    />
                </div>
            ))}
        </div>
        <div>
            <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Negatif (Opsional)</label>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Sebutkan hal-hal yang ingin Anda hindari pada gambar.</p>
            <textarea
                id="negative-prompt" value={negativePrompt} onChange={(e) => dispatch({ type: 'SET_NEGATIVE_PROMPT', payload: e.target.value })}
                placeholder="Contoh: blur, teks, logo, tangan manusia, kualitas rendah..."
                className="w-full h-20 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" rows={2}
            />
        </div>
    </motion.div>
  );

  const renderFashionModeUI = () => (
    <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-4 flex flex-col gap-4"
    >
        {isGeneratingFashionOptions && <Loader message="AI sedang menyiapkan studio..." />}
        {fashionOptions && !isGeneratingFashionOptions && (
            <>
                <NumberSelector
                    value={numberOfImages}
                    onChange={(num) => dispatch({ type: 'SET_NUMBER_OF_IMAGES', payload: num })}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gaya Model</label>
                    <select value={selectedFashionModelStyle} onChange={(e) => dispatch({ type: 'SET_FASHION_SELECTION', payload: { field: 'selectedFashionModelStyle', value: e.target.value }})} className="w-full p-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white">
                        <option value={SMART_MIX_MODE}>{SMART_MIX_MODE}</option>
                        {fashionOptions.modelStyles.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latar Belakang</label>
                    <select value={selectedFashionBackground} onChange={(e) => dispatch({ type: 'SET_FASHION_SELECTION', payload: { field: 'selectedFashionBackground', value: e.target.value }})} className="w-full p-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white">
                        <option value={SMART_MIX_MODE}>{SMART_MIX_MODE}</option>
                        {fashionOptions.backgrounds.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipe Shot</label>
                    <select value={selectedFashionShotType} onChange={(e) => dispatch({ type: 'SET_FASHION_SELECTION', payload: { field: 'selectedFashionShotType', value: e.target.value }})} className="w-full p-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white">
                        <option value={SMART_MIX_MODE}>{SMART_MIX_MODE}</option>
                        {fashionOptions.shotTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt Negatif (Opsional)</label>
                    <textarea
                        value={negativePrompt} onChange={(e) => dispatch({ type: 'SET_NEGATIVE_PROMPT', payload: e.target.value })}
                        placeholder="Contoh: blur, teks, logo, kualitas rendah..."
                        className="w-full h-20 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200" rows={2}
                    />
                </div>
            </>
        )}
    </motion.div>
  );
  
  const renderKonsepKustomUI = () => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-4 flex flex-col gap-4"
    >
        <NumberSelector
            value={numberOfImages}
            onChange={(num) => dispatch({ type: 'SET_NUMBER_OF_IMAGES', payload: num })}
        />
        <div>
            <label htmlFor="user-concept" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ide Konsep Anda</label>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Jelaskan ide Anda, biarkan fotografer AI kami yang mengembangkannya.</p>
            <textarea
                id="user-concept"
                value={userConcept}
                onChange={(e) => dispatch({ type: 'SET_USER_CONCEPT', payload: e.target.value })}
                placeholder="Contoh: 'Suasana musim panas di pantai untuk produk minumanku' atau 'Tampilan gelap dan misterius seperti film noir'."
                className="w-full h-28 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                rows={4}
            />
        </div>
        <div>
            <label htmlFor="negative-prompt-konsep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Negatif (Opsional)</label>
            <textarea
                id="negative-prompt-konsep" value={negativePrompt} onChange={(e) => dispatch({ type: 'SET_NEGATIVE_PROMPT', payload: e.target.value })}
                placeholder="Contoh: warna pink, terlalu ramai, kartun..."
                className="w-full h-20 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" rows={2}
            />
        </div>
    </motion.div>
  );

  const renderReferenceBackgroundUI = () => (
    <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-4 flex flex-col gap-4"
    >
        <NumberSelector
            value={numberOfImages}
            onChange={(num) => dispatch({ type: 'SET_NUMBER_OF_IMAGES', payload: num })}
        />
        <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Unggah Latar Belakang Referensi</h3>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Unggah gambar yang akan digunakan AI sebagai inspirasi untuk latar belakang, pencahayaan, dan gaya.</p>
            <ImageUploader onImageUpload={handleReferenceBackgroundUpload} image={referenceBackgroundImage} />
        </div>
        <div>
            <label htmlFor="negative-prompt-reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Negatif (Opsional)</label>
            <textarea
                id="negative-prompt-reference" value={negativePrompt} onChange={(e) => dispatch({ type: 'SET_NEGATIVE_PROMPT', payload: e.target.value })}
                placeholder="Contoh: blur, teks, logo, kualitas rendah..."
                className="w-full h-20 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200" rows={2}
            />
        </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="lg:col-span-1 bg-white dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col gap-6">
            <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">1. Unggah Foto Produkmu</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pilih gambar produk amatir Anda.</p>
            </div>
            <ImageUploader onImageUpload={handleImageUpload} image={uploadedImage} enableCropper />
            {uploadedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex justify-between items-center">
                    <p className="text-gray-600 dark:text-gray-400 font-semibold">Deskripsi Produk:</p>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleGenerateAIDescription}
                            disabled={!identifiedProductName || isGeneratingDescription || isIdentifying}
                            className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Buat deskripsi dengan AI"
                        >
                            {isGeneratingDescription ? (
                                <div className="w-4 h-4 border-2 border-gray-500/50 dark:border-white/50 border-t-gray-500 dark:border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <SparklesIcon />
                            )}
                        </button>
                        <button onClick={() => dispatch({ type: 'OPEN_DESCRIPTION_MODAL' })} className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold text-xs">Ubah</button>
                    </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-1 italic break-words">{productDescription || "Tidak ada deskripsi ditambahkan."}</p>
            </motion.div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">2. Pilih Gaya Foto Profesional</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gunakan gaya preset, atau buat prompt kustom Anda sendiri.</p>
                </div>
                <StyleSelector selectedStyle={selectedStyle} onSelectStyle={handleStyleSelect} disabled={!uploadedImage} />
                {uploadedImage && selectedStyle && ![PhotoStyle.Smart, PhotoStyle.KonsepKustom, PhotoStyle.ModeFashion, PhotoStyle.ReferenceBackground].includes(selectedStyle) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-4"
                    >
                        <NumberSelector
                            value={numberOfImages}
                            onChange={(num) => dispatch({ type: 'SET_NUMBER_OF_IMAGES', payload: num })}
                        />
                         <div className="mt-4">
                            <label htmlFor="negative-prompt-preset" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Negatif (Opsional)</label>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Berlaku untuk semua gambar yang dihasilkan dengan gaya ini.</p>
                            <textarea
                                id="negative-prompt-preset" value={negativePrompt} onChange={(e) => dispatch({ type: 'SET_NEGATIVE_PROMPT', payload: e.target.value })}
                                placeholder="Contoh: blur, teks, logo, tangan manusia..."
                                className="w-full h-20 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" rows={2}
                            />
                        </div>
                    </motion.div>
                )}
                {uploadedImage && selectedStyle === PhotoStyle.ReferenceBackground && renderReferenceBackgroundUI()}
                {uploadedImage && selectedStyle === PhotoStyle.ModeFashion && renderFashionModeUI()}
                {uploadedImage && selectedStyle === PhotoStyle.Smart && renderCustomPromptUI()}
                {uploadedImage && selectedStyle === PhotoStyle.KonsepKustom && renderKonsepKustomUI()}
            </>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <button onClick={handleGenerate} disabled={isGenerationDisabled} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900">
                <SparklesIcon />{isLoading ? 'Menciptakan Kembali...' : 'Ciptakan Ulang Fotomu'}
            </button>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="lg:col-span-2 bg-white dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg min-h-[30rem] flex flex-col justify-center items-center">
            <AnimatePresence mode="wait">
                {isLoading && <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader message={loadingMessage} /></motion.div>}
                {error && !isLoading && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-red-500 dark:text-red-400">
                    <h3 className="font-bold text-lg">Oops! Terjadi Kesalahan</h3>
                    <p className="text-sm mt-2">{error}</p>
                    <button onClick={handleGenerate} className="mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-indigo-500">Coba Lagi</button>
                </motion.div>
                )}
                {!isLoading && !error && results.length > 0 && (
                    <ResultDisplay 
                        results={results} originalImage={uploadedImage} onStartOver={handleStartOver} onRegenerate={handleRegenerate}
                        regeneratingIndices={regeneratingIndices} onDownloadAll={handleDownloadAll} onUseAsInput={handleUseAsInput}
                        productDescription={productDescription}
                        onNavigateToApp={onNavigateToApp}
                        onUpdateVideoPrompt={handleUpdateVideoPrompt}
                        onUpdatePromoScript={handleUpdatePromoScript}
                        onOpenVideoModal={handleVideoGenerationRequest}
                    />
                )}
                {!isLoading && !error && results.length === 0 && (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-gray-500 dark:text-gray-500 flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 mb-4 text-gray-400 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L9.27 9.27L3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73L12 3z"/><path d="M4.5 4.5l1.5 1.5"/><path d="M18 4.5l-1.5 1.5"/><path d="M4.5 19.5l1.5-1.5"/><path d="M18 19.5l-1.5-1.5"/></svg>
                    <h3 className="font-bold text-lg text-gray-600 dark:text-gray-400">Hasil Foto Profesional Anda</h3>
                    <p className="text-sm mt-1 max-w-sm">Akan muncul di sini, lengkap dengan perbandingan sebelum & sesudah.</p>
                </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      </div>
      {results.length > 0 && (
          <SessionGallery results={results} />
      )}
      <HistoryDisplay history={history} onPreview={setHistoryPreview} />
      <AnimatePresence>
        {isDescriptionModalOpen && (
            <DescriptionModal
                isOpen={isDescriptionModalOpen}
                onClose={() => dispatch({ type: 'CLOSE_DESCRIPTION_MODAL' })}
                onSave={handleSaveDescription}
                initialDescription={productDescription}
            />
        )}
      </AnimatePresence>
      <AnimatePresence>
          {historyPreview && (
              <HistoryPreviewModal
                  session={historyPreview}
                  onClose={() => setHistoryPreview(null)}
              />
          )}
      </AnimatePresence>
      <AnimatePresence>
          {isFreeTierWarningOpen && (
              <FreeTierVideoWarningModal
                  isOpen={isFreeTierWarningOpen}
                  onClose={() => {
                      setIsFreeTierWarningOpen(false);
                      setVideoToGenerate(null);
                  }}
                  onContinue={proceedWithVideoGeneration}
              />
          )}
      </AnimatePresence>
      <AnimatePresence>
          {isVideoModalOpen && videoToGenerate && (
              <VideoGenerationModal
                  isOpen={isVideoModalOpen}
                  onClose={handleCloseVideoModal}
                  imageToAnimateUrl={videoToGenerate.imageUrl}
                  initialPrompt={videoToGenerate.videoPrompt || ''}
                  onGenerate={handleGenerateVideo}
                  isLoading={isGeneratingVideo}
                  loadingMessage={videoLoadingMessage}
                  generatedVideoUrl={generatedVideoUrl}
                  sourceImageAspectRatio="1:1" // Photography Specialist outputs square images
              />
          )}
      </AnimatePresence>
    </div>
  );
};


// --- NEW STUDIO LAYOUT COMPONENTS ---

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);


const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);

const apps = [
    { id: 'home', name: 'Halaman Utama', icon: <HomeIcon />, enabled: true, description: '' },
    { id: 'readme', name: '(Mohon Dibaca)', icon: <InfoIcon className="w-5 h-5" />, enabled: true, description: 'Panduan penting, limitasi, dan tips kreatif untuk memaksimalkan studio ini.' },
    { id: 'marketo', name: 'Marketo: Konsultan AI', icon: <MarketoIcon />, enabled: true, description: 'Dapatkan strategi pemasaran ahli untuk produk Anda melalui obrolan.' },
    { id: 'photography', name: 'Spesialis Fotografi', icon: <CameraIcon />, enabled: true, description: 'Ubah foto amatir jadi profesional dengan sekali klik.' },
    { id: 'stylo', name: 'Stylo - Model Produk', icon: <UserFocusIcon />, enabled: true, description: 'Pasangkan model AI dengan produk Anda untuk foto fashion menakjubkan.' },
    { id: 'affiliator', name: 'Ads Storyboard Pro', icon: <AffiliateIcon />, enabled: true, description: 'Buat naskah, visualisasi adegan, dan aset produksi untuk iklan video Anda.' },
    { id: 'video', name: 'Generator Video Produk', icon: <VideoGeneratorIcon />, enabled: true, description: 'Hidupkan produk Anda dengan video sinematik pendek yang memukau.' },
    { id: 'copywriter', name: 'AI Copywriter Pro', icon: <CopywriterIcon />, enabled: true, description: 'Dapatkan teks iklan yang menjual untuk berbagai platform media sosial.' },
    { id: 'voiceover', name: 'Studio Voiceover AI', icon: <VoiceoverIcon />, enabled: true, description: 'Buat rekaman suara profesional dari naskah Anda dengan suara AI.' },
    { id: 'poster', name: 'Desain Poster AI', icon: <PosterIcon />, enabled: true, description: 'Rancang poster produk yang menarik secara otomatis.' },
    { id: 'lp-generator', name: 'LP Generator Pro', icon: <LpGeneratorIcon />, enabled: true, description: 'Rancang naskah landing page yang menjual dari awal hingga akhir.' },
];

const Sidebar: React.FC<{ 
    activeApp: string; 
    setActiveApp: (id: string) => void; 
    onOpenApiKeyModal: () => void;
    onOpenModelSettingsModal: () => void;
}> = ({ activeApp, setActiveApp, onOpenApiKeyModal, onOpenModelSettingsModal }) => {
    return (
        <aside className="w-64 h-full flex-shrink-0 bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700/50 flex flex-col">
            <nav className="flex-grow p-4 space-y-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Alat</p>
                {apps.map(app => (
                    <button
                        key={app.id}
                        onClick={() => app.enabled && setActiveApp(app.id)}
                        disabled={!app.enabled}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transform transition-all duration-200
                            ${activeApp === app.id 
                                ? 'bg-indigo-600 text-white shadow' 
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-105'
                            }
                            ${!app.enabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {app.icon}
                        <span>{app.name}</span>
                    </button>
                ))}
            </nav>
             <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700/50 space-y-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pengaturan</p>
                 <button
                    onClick={onOpenModelSettingsModal}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transform hover:scale-105 transition-all duration-200"
                  >
                    <SettingsIcon />
                    <span>Pengaturan Model</span>
                  </button>
                  <button
                    onClick={onOpenApiKeyModal}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transform hover:scale-105 transition-all duration-200"
                  >
                    <KeyIcon />
                    <span>Cadangan API Key</span>
                  </button>
            </div>
        </aside>
    );
};

const ComingSoon: React.FC<{ appName: string }> = ({ appName }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
        <div className="bg-gray-200 dark:bg-gray-800 p-6 rounded-full mb-6">
            {apps.find(app => app.name === appName)?.icon}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{appName}</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Fitur ini akan segera hadir. Nantikan!</p>
    </div>
);

const ThemeToggle: React.FC<{ theme: string; toggleTheme: () => void }> = ({ theme, toggleTheme }) => (
    <button onClick={toggleTheme} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle theme">
        {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
    </button>
);


const App: React.FC = () => {
    const [activeApp, setActiveApp] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [isModelSettingsModalOpen, setIsModelSettingsModalOpen] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark';
        
        root.classList.remove(isDark ? 'light' : 'dark');
        root.classList.add(theme);
        
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
      // If the currently active app ID is no longer in the list of available apps (e.g., after being removed),
      // reset to the home page to avoid a blank screen or error.
      if (!apps.some(app => app.id === activeApp)) {
          setActiveApp('home');
      }
    }, [activeApp]);

    const handleAppSelection = (id: string) => {
        if (apps.find(app => app.id === id)?.enabled) {
            setActiveApp(id);
        }
        setIsSidebarOpen(false);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    // Map of app IDs to their respective components.
    // This allows us to render them all while only showing the active one, preserving state.
    const appComponentMap: Record<string, React.ReactElement> = {
        'home': <HomePage apps={apps.filter(app => !['home', 'readme'].includes(app.id))} onNavigate={setActiveApp} />,
        'readme': <ReadMePage />,
        'marketo': <ChatTechnician />,
        'photography': <PhotographySpecialistApp onNavigateToApp={setActiveApp} />,
        'stylo': <StyloApp onNavigateToApp={setActiveApp} />,
        'affiliator': <AdsStoryboardPro onNavigateToApp={setActiveApp} />,
        'video': <ProductVideoGenerator />,
        'copywriter': <AICopywriterPro />,
        'voiceover': <AIVoiceoverStudio />,
        'poster': <PosterCreator />,
        'lp-generator': <LpGeneratorPro onNavigateToApp={setActiveApp} />,
    };

    const knownAppIds = Object.keys(appComponentMap);
    const activeAppInfo = apps.find(app => app.id === activeApp);

    return (
        <div className="h-screen w-full flex flex-col font-sans bg-gray-100 dark:bg-gray-900">
            <header className="flex-shrink-0 flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-20">
                 <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
                    aria-label="Buka menu navigasi"
                 >
                    <MenuIcon />
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                   Ultimate AI Product Studio
                </h1>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </header>
            <div className="flex flex-1 overflow-hidden">
                {/* Static sidebar for desktop */}
                <div className="hidden lg:block flex-shrink-0">
                    <Sidebar 
                        activeApp={activeApp} 
                        setActiveApp={setActiveApp} 
                        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                        onOpenModelSettingsModal={() => setIsModelSettingsModalOpen(true)}
                    />
                </div>

                {/* Mobile sidebar with overlay */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="fixed inset-y-0 left-0 z-40 lg:hidden"
                            >
                                <Sidebar 
                                    activeApp={activeApp} 
                                    setActiveApp={handleAppSelection} 
                                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                                    onOpenModelSettingsModal={() => setIsModelSettingsModalOpen(true)}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">
                   <div className="mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8">
                        {activeAppInfo && !['home', 'readme'].includes(activeAppInfo.id) && (
                            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activeAppInfo.name}</h2>
                                {activeAppInfo.description && (
                                    <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-3xl">{activeAppInfo.description}</p>
                                )}
                            </div>
                        )}
                        {/* Render all known apps but hide the inactive ones to preserve state */}
                        {knownAppIds.map(appId => (
                            <div key={appId} style={{ display: activeApp === appId ? 'block' : 'none' }}>
                                {appComponentMap[appId]}
                            </div>
                        ))}

                        {/* If the active app is NOT a known one, it might be a 'Coming Soon' app */}
                        {!knownAppIds.includes(activeApp) && (() => {
                            const appInfo = apps.find(app => app.id === activeApp);
                            return appInfo ? <ComingSoon key={appInfo.id} appName={appInfo.name} /> : <div key="not-found">App not found</div>;
                        })()}
                   </div>
                </main>
            </div>
            <footer className="flex-shrink-0 py-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800">
                Created by Muhammad Gustonur Zakaria
            </footer>

            <AnimatePresence>
              {isApiKeyModalOpen && (
                <ApiKeyModal 
                  isOpen={isApiKeyModalOpen} 
                  onClose={() => setIsApiKeyModalOpen(false)} 
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isModelSettingsModalOpen && (
                <ModelSettingsModal
                  isOpen={isModelSettingsModalOpen}
                  onClose={() => setIsModelSettingsModalOpen(false)}
                />
              )}
            </AnimatePresence>
        </div>
    );
}

export default App;