import React, { useReducer, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Import AiRecommendations from types.ts, not geminiService.ts
import { UploadedImage, AiRecommendations } from '../types';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { generateStyloImage, generatePoseIdeas, expandProductDescription, getAiPhotoshootRecommendations, identifyProduct, estimateProductSize, generatePromoPoses, generateVideo, checkVideoStatus } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import StyloPreviewModal from './StyloPreviewModal';
import PresetPoseModal from './PresetPoseModal';
import { DownloadIcon } from './icons/DownloadIcon';
import SmartPromoModal from './SmartPromoModal'; // New Import
import FreeTierVideoWarningModal from './FreeTierVideoWarningModal';
import VideoGenerationModal from './VideoGenerationModal';


const PRESET_POSES = {
  'Pameran Produk': [
    'Model memegang produk di depan dada, menatap lurus ke kamera dengan senyum lembut.',
    'Produk diletakkan di permukaan, model berinteraksi dengannya (misal: menyentuh, membuka).',
    'Model menampilkan produk ke arah kamera dengan satu tangan, tubuh sedikit menyamping.',
    'Close-up produk yang sedang digunakan oleh model (misal: jam tangan di pergelangan, tas di bahu).',
    'Model duduk santai dengan produk diletakkan di sampingnya, menciptakan suasana lifestyle.',
    'Model berjalan ke arah kamera sambil menggunakan produk secara alami.',
    'Pose dinamis dengan produk, seolah-olah tertangkap dalam gerakan (misal: mengayunkan tas).',
    'Model bersandar di dinding dengan produk dipegang di satu sisi tubuhnya.',
    'Foto dari atas (flat lay style) dengan tangan model yang menata produk.',
    'Model melihat ke samping, menjauh dari kamera, dengan produk sebagai fokus utama di latar depan.',
    'Produk dipegang di antara kedua telapak tangan, seolah-olah sebuah persembahan berharga.',
    'Model mengintip dari balik produk yang dipegang dekat wajah.',
    'Pose melompat ringan sambil memegang produk, menciptakan kesan ceria.',
    'Produk diletakkan di atas kepala dengan kedua tangan, pose yang unik dan menarik perhatian.',
    'Model berbaring dengan produk diletakkan di sekitarnya secara artistik.',
    'Close-up ekstrem pada tangan model yang memegang produk, menonjolkan detail keduanya.',
    'Model melihat ke cermin, sedang mengaplikasikan produk (lipstik, krim wajah).',
    'Produk diletakkan di permukaan transparan, dengan pantulan model di bawahnya.',
    'Pose bermain-main, melempar produk kecil (seperti lipstik) ke udara.',
    'Tangan model membingkai produk tanpa menyentuhnya, menciptakan fokus visual.',
    'Model duduk di lantai dengan kaki bersila, produk diletakkan di pangkuannya.',
    'Produk dipegang dengan latar belakang bokeh yang indah (lampu kota, taman).',
    'Siluet model yang sedang memegang produk dengan latar belakang matahari terbenam.',
    'Model menutupi sebelah mata dengan produk.',
    'Pose high-fashion, produk diletakkan di bahu seperti aksesori.',
    'Model meniup produk (jika ringan seperti bedak atau kelopak bunga).',
    'Interaksi dengan air, produk dicipratkan air atau diletakkan di dekat air.',
    'Produk dipegang tinggi di atas, seolah meraih sesuatu.',
    'Model berbisik pada produk, menciptakan narasi misterius.',
    'Pose reflektif, model menatap produk dengan ekspresi berpikir atau mengagumi.',
  ],
  'Mode & Pakaian': [
    'Pose berdiri klasik, tangan di saku, menampilkan keseluruhan pakaian.',
    'Model berjalan dengan langkah lebar, menangkap gerakan kain pada pakaian.',
    'Pose duduk di tangga atau kursi, menonjolkan siluet dan detail pakaian.',
    'Model bersandar ke dinding dengan satu kaki ditekuk, menciptakan kesan kasual.',
    'Pose berputar atau melompat ringan untuk menunjukkan aliran dan dinamika pakaian.',
    'Close-up pada detail pakaian (misal: kancing, tekstur kain, kerah) dengan model sebagai latar.',
    'Model menatap ke atas atau ke samping, menciptakan kesan artistik dan editorial.',
    'Pose "street style", seolah-olah difoto secara candid saat berjalan di kota.',
    'Tangan di pinggang, bahu sedikit ke belakang, pose percaya diri klasik.',
    'Model melihat ke bawah ke arah pakaiannya, seolah mengagumi detailnya.',
    'Pose dramatis dengan kain yang beterbangan, ditangkap dengan shutter speed lambat.',
    'Model berbaring di sofa atau lantai mewah, difoto dari atas.',
    'Berjalan menuruni tangga sambil melihat ke belakang melewati bahu.',
    'Pose kekuatan (power pose), berdiri dengan kaki terbuka lebar, tangan di pinggang.',
    'Model duduk di lantai dengan gaun yang menyebar di sekelilingnya.',
    'Bersandar pada mobil klasik, satu tangan di atap mobil.',
    'Menari dengan bebas, menangkap energi dan gerakan.',
    'Pose melankolis, melihat keluar jendela saat hari hujan.',
    'Tangan menyisir rambut ke belakang, menonjolkan garis leher dan bahu.',
    'Memegang kerah jaket atau mantel dengan kedua tangan, tatapan tajam ke kamera.',
    'Pose androgini, memadukan elemen maskulin dan feminin.',
    'Melompat di udara, kaki ditekuk, menangkap momen tanpa bobot.',
    'Duduk di meja kafe, seolah sedang menunggu seseorang.',
    'Membaca buku atau majalah, menciptakan suasana intelektual.',
    'Pose atletis, seperti akan memulai lari atau peregangan.',
    'Mencondongkan tubuh ke depan, menciptakan komposisi yang dinamis.',
    'Bermain dengan bayangan, separuh tubuh dalam cahaya, separuh dalam gelap.',
    'Menggunakan properti seperti payung, topi, atau kacamata hitam secara kreatif.',
    'Pose dari belakang, menonjolkan detail punggung pakaian.',
    'Berdiri di tengah jalan yang sepi (dengan pengawasan), untuk kesan urban yang kuat.',
  ],
  'Foto Potret dan Wajah': [
    'Tatapan lurus ke kamera dengan ekspresi netral atau senyum tipis, fokus pada wajah.',
    'Profil samping (side profile), menonjolkan garis rahang dan leher.',
    'Tangan menopang dagu atau menyentuh pipi dengan lembut.',
    'Model melihat ke atas bahu ke arah kamera.',
    'Rambut tertiup angin (bisa dibantu kipas angin) untuk efek dramatis.',
    'Close-up ekstrem hanya pada mata atau bibir.',
    'Model tertawa lepas, candid.',
    'Pose "beauty shot", tangan membingkai wajah atau menyentuh rambut.',
    'Wajah sedikit menunduk, tatapan mata ke atas ke arah kamera.',
    'Bermain dengan cahaya dan bayangan di wajah, misal: cahaya dari jendela.',
    'Wajah sebagian tertutup oleh daun besar atau bunga.',
    'Melihat melalui jendela yang basah oleh hujan.',
    'Mengaplikasikan daun emas atau glitter di wajah untuk beauty shot.',
    'Meniup gelembung permen karet, difoto saat akan pecah.',
    'Ekspresi terkejut atau kagum yang tulus.',
    'Wajah basah seolah baru keluar dari air, tetesan air terlihat jelas.',
    'Satu mata ditutup dengan tangan, mata yang lain menatap tajam.',
    'Wajah dilukis dengan cat neon yang bersinar di bawah lampu UV.',
    'Potret melalui objek transparan seperti gelas atau botol.',
    'Ekspresi menangis yang artistik, dengan air mata glitter.',
    'Menjulurkan lidah, pose yang ceria dan sedikit memberontak.',
    'Memegang cermin pecah di depan wajah, menciptakan refleksi yang terfragmentasi.',
    'Wajah tersembul dari dalam air.',
    'Potret ganda (double exposure) dengan siluet dan pemandangan alam.',
    'Menutup mulut dengan kedua tangan, mata menunjukkan emosi yang kuat.',
    'Tangan penuh cat warna-warni menutupi sebagian wajah.',
    'Potret high-key dengan latar belakang putih total dan pencahayaan lembut.',
    'Potret low-key dengan latar belakang hitam total dan satu sumber cahaya dramatis.',
    'Meniup asap (dari vape atau dupa) ke arah kamera.',
    'Wajah ditekan ke permukaan kaca, menciptakan distorsi yang menarik.',
  ],
  'Promosi Cerdas ✨': [], // New smart promotion category
};

export const PROMO_TYPES = [
  { name: 'Diskon Besar / Sale', desc: 'Ciptakan pose yang heboh, mendesak, dan penuh energi.', icon: '🏷️' },
  { name: 'Produk Baru / Baru Tiba', desc: 'Pose yang menampilkan kebaruan, misteri, dan rasa penasaran.', icon: '✨' },
  { name: 'Edisi Terbatas', desc: 'Tampilkan kesan eksklusif, mewah, dan langka.', icon: '💎' },
  { name: 'Giveaway / Kontes', desc: 'Pose yang ceria, mengajak, dan penuh antusiasme.', icon: '🎉' },
  { name: 'Beli 1 Gratis 1', desc: 'Fokus pada interaksi dengan dua produk atau lebih.', icon: '🎁' },
  { name: 'Pengumuman Penting', desc: 'Pose yang menarik perhatian dan membangun antisipasi.', icon: '📢' },
];


const CREATIVE_OPTIONS = {
  outfit: ['Mode Cerdas', 'Sesuai Asli', 'Kasual Bisnis', 'Gaun Musim Panas', 'Pakaian Olahraga', 'Pakaian Malam Formal', 'Gaya Jalanan (Streetwear)', 'Kustom'],
  background: ['Mode Cerdas', 'Sesuai Asli', 'Studio Polos (Putih/Abu-abu)', 'Kafe Modern', 'Taman Kota', 'Pantai Tropis', 'Interior Mewah', 'Latar Belakang Arsitektur', 'Kustom'],
  mood: ['Mode Cerdas', 'Ceria & Enerjik', 'Elegan & Canggih', 'Misterius & Dramatis', 'Tenang & Damai', 'Hangat & Nyaman'],
  lighting: ['Mode Cerdas', 'Cahaya Studio Lembut (Softbox)', 'Cahaya Alami (Jendela)', 'Cahaya Tajam & Kontras Tinggi', 'Golden Hour (Matahari Terbenam)', 'Lampu Neon'],
};

// --- Types ---
type PoseMode = 'manual' | 'preset' | 'ai_agent';
type Consistency = 'all' | 'character' | 'custom';

export interface StyloResult {
    imageUrl: string;
    prompt: string;
    pose: string;
    videoPrompt?: string;
    promoScript?: string;
}

interface StyloAppProps {
    onNavigateToApp: (appId: string) => void;
}

// --- State & Reducer ---
interface StyloState {
    modelImage: UploadedImage | null;
    modelWearsHijab: boolean;
    productImage: UploadedImage | null;
    productDescription: string;
    productSize: string;
    isIdentifyingProduct: boolean;
    isUpdatingDescription: boolean;
    isRecommending: boolean;
    
    poseMode: PoseMode;
    poseCount: number;
    poseStyle: string; // For manual
    customPoses: string[];
    selectedPresetPoses: string[];
    isPoseModalOpen: boolean;
    isPromoModalOpen: boolean; // New state for promo modal
    currentPoseCategory: keyof typeof PRESET_POSES | null;

    outfit: string;
    customOutfit: string;
    background: string;
    customBackground: string;
    mood: string;
    lighting: string;

    additionalPrompt: string;
    consistency: Consistency;
    customNegativePrompt: string;

    isLoading: boolean;
    loadingMessage: string;
    error: string | null;
    results: StyloResult[];
    regeneratingIndex: number | null;
    
    previewIndex: number | null; // For preview modal
}

const initialState: StyloState = {
    modelImage: null,
    modelWearsHijab: false,
    productImage: null,
    productDescription: '',
    productSize: '',
    isIdentifyingProduct: false,
    isUpdatingDescription: false,
    isRecommending: false,
    poseMode: 'ai_agent',
    poseCount: 4,
    poseStyle: 'Elegan',
    customPoses: Array(4).fill(''),
    selectedPresetPoses: [],
    isPoseModalOpen: false,
    isPromoModalOpen: false, // New state
    currentPoseCategory: null,
    outfit: 'Mode Cerdas',
    customOutfit: '',
    background: 'Mode Cerdas',
    customBackground: '',
    mood: 'Mode Cerdas',
    lighting: 'Mode Cerdas',
    additionalPrompt: '',
    consistency: 'character',
    customNegativePrompt: 'deformed, blurry, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, floating limbs, disconnected limbs, malformed hands, out of focus, long neck, long body',
    isLoading: false,
    loadingMessage: 'AI sedang bekerja...',
    error: null,
    results: [],
    regeneratingIndex: null,
    previewIndex: null,
};

type StyloAction = 
    | { type: 'SET_MODEL_IMAGE'; payload: UploadedImage | null }
    | { type: 'SET_PRODUCT_IMAGE'; payload: UploadedImage | null }
    | { type: 'SET_PRODUCT_DESCRIPTION'; payload: string }
    | { type: 'SET_FIELD'; payload: { field: keyof StyloState; value: any } }
    | { type: 'UPDATE_CUSTOM_POSE'; payload: { index: number; value: string } }
    | { type: 'SET_CUSTOM_POSES'; payload: string[] }
    | { type: 'GENERATE_START' }
    | { type: 'GENERATE_SUCCESS'; payload: StyloResult[] }
    | { type: 'GENERATE_ERROR'; payload: string }
    | { type: 'REGENERATE_START'; payload: number }
    | { type: 'REGENERATE_SUCCESS'; payload: { index: number; result: StyloResult } }
    | { type: 'REGENERATE_ERROR'; payload: string }
    | { type: 'SET_PREVIEW_INDEX'; payload: number | null }
    | { type: 'START_OVER' }
    | { type: 'UPDATE_VIDEO_PROMPT'; payload: { index: number; prompt: string } }
    | { type: 'UPDATE_PROMO_SCRIPT'; payload: { index: number; script: string } }
    | { type: 'IDENTIFY_PRODUCT_START' }
    | { type: 'IDENTIFY_PRODUCT_NAME_SUCCESS'; payload: string }
    | { type: 'ESTIMATE_SIZE_SUCCESS'; payload: string }
    | { type: 'IDENTIFY_PRODUCT_ERROR' }
    | { type: 'UPDATE_DESCRIPTION_START' }
    | { type: 'UPDATE_DESCRIPTION_SUCCESS'; payload: string }
    | { type: 'UPDATE_DESCRIPTION_ERROR' }
    | { type: 'OPEN_POSE_MODAL'; payload: keyof typeof PRESET_POSES }
    | { type: 'CLOSE_POSE_MODAL' }
    | { type: 'OPEN_PROMO_MODAL' } // New action
    | { type: 'CLOSE_PROMO_MODAL' } // New action
    | { type: 'SET_SELECTED_PRESET_POSES'; payload: string[] }
    | { type: 'GET_AI_RECOMMENDATIONS_START' }
    | { type: 'GET_AI_RECOMMENDATIONS_SUCCESS'; payload: AiRecommendations }
    | { type: 'GET_AI_RECOMMENDATIONS_ERROR'; payload: string };


function styloReducer(state: StyloState, action: StyloAction): StyloState {
    switch (action.type) {
        case 'SET_MODEL_IMAGE': return { ...state, modelImage: action.payload, results: [], error: null };
        case 'SET_PRODUCT_IMAGE': return { ...state, productImage: action.payload, productDescription: '', productSize: '' };
        case 'SET_PRODUCT_DESCRIPTION': return { ...state, productDescription: action.payload };
        case 'SET_FIELD': return { ...state, [action.payload.field]: action.payload.value };
        case 'UPDATE_CUSTOM_POSE': {
            const newPoses = [...state.customPoses];
            newPoses[action.payload.index] = action.payload.value;
            return { ...state, customPoses: newPoses };
        }
        case 'SET_CUSTOM_POSES': return { ...state, customPoses: action.payload };
        case 'GENERATE_START': return { ...state, isLoading: true, error: null, results: [] };
        case 'GENERATE_SUCCESS': return { ...state, isLoading: false, results: action.payload };
        case 'GENERATE_ERROR': return { ...state, isLoading: false, error: action.payload };
        case 'REGENERATE_START': return { ...state, regeneratingIndex: action.payload, error: null };
        case 'REGENERATE_SUCCESS': {
            const newResults = [...state.results];
            // Preserve the video prompt and promo script during regeneration
            const oldResult = state.results[action.payload.index];
            newResults[action.payload.index] = { 
                ...action.payload.result, 
                videoPrompt: oldResult?.videoPrompt,
                promoScript: oldResult?.promoScript 
            };
            return { ...state, results: newResults, regeneratingIndex: null };
        }
        case 'REGENERATE_ERROR': return { ...state, regeneratingIndex: null, error: action.payload };
        case 'SET_PREVIEW_INDEX': return { ...state, previewIndex: action.payload };
        case 'START_OVER': return { ...initialState };
        case 'UPDATE_VIDEO_PROMPT': {
            const newResults = [...state.results];
            if (newResults[action.payload.index]) {
                newResults[action.payload.index].videoPrompt = action.payload.prompt;
            }
            return { ...state, results: newResults };
        }
        case 'UPDATE_PROMO_SCRIPT': {
            const newResults = [...state.results];
            if (newResults[action.payload.index]) {
                newResults[action.payload.index].promoScript = action.payload.script;
            }
            return { ...state, results: newResults };
        }
        case 'IDENTIFY_PRODUCT_START': return { ...state, isIdentifyingProduct: true, productDescription: '', productSize: '' };
        case 'IDENTIFY_PRODUCT_NAME_SUCCESS': return { ...state, isIdentifyingProduct: false, productDescription: action.payload };
        case 'ESTIMATE_SIZE_SUCCESS': return { ...state, productSize: action.payload };
        case 'IDENTIFY_PRODUCT_ERROR': return { ...state, isIdentifyingProduct: false, productDescription: 'Gagal mengidentifikasi produk.' };
        case 'UPDATE_DESCRIPTION_START': return { ...state, isUpdatingDescription: true };
        case 'UPDATE_DESCRIPTION_SUCCESS': return { ...state, isUpdatingDescription: false, productDescription: action.payload };
        case 'UPDATE_DESCRIPTION_ERROR': return { ...state, isUpdatingDescription: false, productDescription: state.productDescription + ' (Gagal membuat deskripsi.)' };
        case 'SET_SELECTED_PRESET_POSES':
            return { ...state, selectedPresetPoses: action.payload, isPoseModalOpen: false, currentPoseCategory: null };
        case 'OPEN_POSE_MODAL':
            return { ...state, isPoseModalOpen: true, currentPoseCategory: action.payload };
        case 'CLOSE_POSE_MODAL':
            return { ...state, isPoseModalOpen: false, currentPoseCategory: null };
        case 'OPEN_PROMO_MODAL':
            return { ...state, isPromoModalOpen: true };
        case 'CLOSE_PROMO_MODAL':
            return { ...state, isPromoModalOpen: false };
        case 'GET_AI_RECOMMENDATIONS_START':
            return { ...state, isRecommending: true, error: null };
        case 'GET_AI_RECOMMENDATIONS_SUCCESS': {
            const { poses, outfit, background, mood, lighting } = action.payload;
            const newState = { ...state, isRecommending: false };

            // Fill poses
            const newPoses = Array(state.poseCount).fill('');
            for (let i = 0; i < Math.min(state.poseCount, poses.length); i++) {
                newPoses[i] = poses[i];
            }
            newState.customPoses = newPoses;

            // Smart update for outfit
            if (state.outfit === 'Mode Cerdas') {
                if (CREATIVE_OPTIONS.outfit.includes(outfit)) {
                    newState.outfit = outfit;
                } else {
                    newState.outfit = 'Kustom';
                    newState.customOutfit = outfit;
                }
            }
            // Smart update for background
            if (state.background === 'Mode Cerdas') {
                if (CREATIVE_OPTIONS.background.includes(background)) {
                    newState.background = background;
                } else {
                    newState.background = 'Kustom';
                    newState.customBackground = background;
                }
            }
            // Update mood and lighting if in smart mode
            if (state.mood === 'Mode Cerdas') newState.mood = mood;
            if (state.lighting === 'Mode Cerdas') newState.lighting = lighting;

            return newState;
        }
        case 'GET_AI_RECOMMENDATIONS_ERROR':
            return { ...state, isRecommending: false, error: action.payload };
        default: return state;
    }
}

// --- Helper Components ---
const RadioPill: React.FC<{label: string, value: string, name: string, checked: boolean, onChange: (val: any) => void }> = ({ label, value, name, checked, onChange }) => (
    <label className={`px-3 py-1.5 text-sm font-medium rounded-full cursor-pointer transform transition-all hover:scale-105 ${checked ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        <input type="radio" name={name} value={value} checked={checked} onChange={e => onChange(e.target.value)} className="hidden" />
        {label}
    </label>
);

const SelectInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <select value={value} onChange={onChange} className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
      {children}
    </select>
  </div>
);


// --- Session Persistence ---
function initStateFromSession(initial: StyloState): StyloState {
    try {
        const stored = sessionStorage.getItem('stylo-app-session');
        if (stored) {
            const parsed = JSON.parse(stored);
            delete parsed.results;
            delete parsed.openSections; // Remove obsolete property
            return { 
                ...initial, 
                ...parsed,
                isLoading: false, 
                loadingMessage: 'AI sedang bekerja...',
                error: null,
                regeneratingIndex: null,
                previewIndex: null,
                isPoseModalOpen: false,
                isPromoModalOpen: false,
                currentPoseCategory: null,
                isRecommending: false,
                isIdentifyingProduct: false,
            };
        }
    } catch (e) {
        console.error("Failed to parse Stylo session state:", e);
        sessionStorage.removeItem('stylo-app-session');
    }
    return initial;
}

// --- Main App Component ---
const MiniSpinner: React.FC = () => <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>;

const StyloApp: React.FC<StyloAppProps> = ({ onNavigateToApp }) => {
  const [state, dispatch] = useReducer(styloReducer, initialState, initStateFromSession);

  const {
    modelImage, modelWearsHijab, productImage, productDescription, productSize, isIdentifyingProduct, isUpdatingDescription, poseMode, poseCount, poseStyle, customPoses,
    outfit, customOutfit, background, customBackground, mood, lighting,
    additionalPrompt, consistency, customNegativePrompt,
    isLoading, loadingMessage, error, results, regeneratingIndex,
    previewIndex, selectedPresetPoses, isPoseModalOpen, currentPoseCategory, isRecommending, isPromoModalOpen
  } = state;

  // --- Video Generation State & Logic ---
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isFreeTierWarningOpen, setIsFreeTierWarningOpen] = useState(false);
  const [videoToGenerate, setVideoToGenerate] = useState<StyloResult | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const videoPollingRef = useRef<number | null>(null);
  
  useEffect(() => {
    const stateToStore = {
        modelImage, modelWearsHijab, productImage, productDescription, productSize, poseMode, poseCount, poseStyle, customPoses, selectedPresetPoses,
        outfit, customOutfit, background, customBackground, mood, lighting,
        additionalPrompt, consistency, customNegativePrompt,
    };
    sessionStorage.setItem('stylo-app-session', JSON.stringify(stateToStore));
  }, [
      modelImage, modelWearsHijab, productImage, productDescription, productSize, poseMode, poseCount, poseStyle, customPoses, selectedPresetPoses,
      outfit, customOutfit, background, customBackground, mood, lighting,
      additionalPrompt, consistency, customNegativePrompt
  ]);

  useEffect(() => {
    if (productImage && !productDescription && !isIdentifyingProduct) {
      const identifyName = async () => {
        dispatch({ type: 'IDENTIFY_PRODUCT_START' });
        try {
          const name = await identifyProduct(productImage);
          dispatch({ type: 'IDENTIFY_PRODUCT_NAME_SUCCESS', payload: name });
        } catch (e) {
          dispatch({ type: 'IDENTIFY_PRODUCT_ERROR' });
        }
      };
      identifyName();
    }
  }, [productImage, productDescription, isIdentifyingProduct]);

  useEffect(() => {
    if (productImage && productDescription && !isIdentifyingProduct && !productSize) {
      const estimateSizeInBackground = async () => {
        try {
          const { estimatedSize } = await estimateProductSize(productImage);
          dispatch({ type: 'ESTIMATE_SIZE_SUCCESS', payload: estimatedSize });
        } catch (e) {
          console.error("Gagal memperkirakan ukuran produk di latar belakang:", e);
        }
      };
      estimateSizeInBackground();
    }
  }, [productImage, productDescription, isIdentifyingProduct, productSize]);

  const setField = useCallback((field: keyof StyloState, value: any) => {
    dispatch({ type: 'SET_FIELD', payload: { field, value } });
  }, []);

  const handlePoseModeChange = useCallback((newMode: PoseMode) => {
    setField('poseMode', newMode);
    if (newMode === 'ai_agent') {
        setField('outfit', 'Mode Cerdas');
        setField('background', 'Mode Cerdas');
        setField('mood', 'Mode Cerdas');
        setField('lighting', 'Mode Cerdas');
    }
  }, [setField]);


  const handleUpdateVideoPrompt = useCallback((index: number, prompt: string) => {
    dispatch({ type: 'UPDATE_VIDEO_PROMPT', payload: { index, prompt } });
  }, []);
  
  const handleUpdatePromoScript = useCallback((index: number, script: string) => {
    dispatch({ type: 'UPDATE_PROMO_SCRIPT', payload: { index, script } });
  }, []);

  const handleExpandDescription = useCallback(async () => {
    if (!productDescription.trim()) return;
    dispatch({ type: 'UPDATE_DESCRIPTION_START' });
    try {
        const result = await expandProductDescription(productDescription);
        dispatch({ type: 'UPDATE_DESCRIPTION_SUCCESS', payload: result.description });
    } catch (e) {
        console.error("Description expansion failed:", e);
        dispatch({ type: 'UPDATE_DESCRIPTION_ERROR' });
    }
  }, [productDescription]);

  const handleGetPoseIdeas = useCallback(async () => {
      if (!modelImage) return;
      setField('isLoading', true);
      setField('loadingMessage', 'Mencari ide pose...');
      try {
        const ideas = await generatePoseIdeas(modelImage, productDescription, poseCount);
        dispatch({ type: 'SET_CUSTOM_POSES', payload: ideas });
      } catch (e) {
        dispatch({ type: 'GENERATE_ERROR', payload: e instanceof Error ? e.message : 'Gagal mendapatkan ide.' });
      } finally {
        setField('isLoading', false);
      }
  }, [modelImage, productDescription, poseCount]);

  const handleGetAiRecommendations = useCallback(async () => {
    if (!productImage) return;
    dispatch({ type: 'GET_AI_RECOMMENDATIONS_START' });
    try {
        const backgroundOptions = CREATIVE_OPTIONS.background.filter(o => !['Mode Cerdas', 'Kustom'].includes(o));
        const moodOptions = CREATIVE_OPTIONS.mood.filter(o => o !== 'Mode Cerdas');
        const lightingOptions = CREATIVE_OPTIONS.lighting.filter(o => o !== 'Mode Cerdas');
        
        const recommendations = await getAiPhotoshootRecommendations(
            productImage, productDescription, productSize, poseCount, backgroundOptions, moodOptions, lightingOptions, modelWearsHijab
        );
        dispatch({ type: 'GET_AI_RECOMMENDATIONS_SUCCESS', payload: recommendations });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
        dispatch({ type: 'GET_AI_RECOMMENDATIONS_ERROR', payload: `Gagal mendapatkan rekomendasi AI. ${errorMessage}` });
    }
  }, [productImage, productDescription, productSize, poseCount, modelWearsHijab]);

  const handleGeneratePromoPoses = useCallback(async (promoType: string): Promise<string[]> => {
    if (!productImage) {
        throw new Error("Gambar produk diperlukan untuk menghasilkan pose promosi.");
    }
    const poses = await generatePromoPoses(productImage, productDescription, promoType, poseCount);
    // Populate poses into AI Agent fields and switch mode
    dispatch({ type: 'SET_CUSTOM_POSES', payload: poses });
    dispatch({ type: 'SET_FIELD', payload: { field: 'poseMode', value: 'ai_agent' } });
    dispatch({ type: 'CLOSE_PROMO_MODAL' });
    return poses;
  }, [productImage, productDescription, poseCount]);
  
  const { isGenerateDisabled, generationPrompts } = useMemo(() => {
    if (!modelImage) return { isGenerateDisabled: true, generationPrompts: [] };
    
    let poses: string[] = [];
    if (poseMode === 'manual') {
        poses = Array(poseCount).fill(`Pose style: ${poseStyle}`);
    } else if (poseMode === 'preset') {
        poses = selectedPresetPoses;
    } else if (poseMode === 'ai_agent') {
        poses = customPoses.filter(p => p.trim() !== '');
    }
    if (poses.length === 0) return { isGenerateDisabled: true, generationPrompts: [] };

    const hijabInstruction = modelWearsHijab ? `
**CRITICAL HIJAB INSTRUCTION:**
- The model in the input image is wearing a hijab. You MUST ensure the model in the generated image is also wearing a full and proper hijab, covering the hair completely. Do not show only an inner cap (ciput) or remove the hijab.
- **Hijab Color Coordination:** The color of the hijab MUST be creatively chosen to match the suggested outfit. Do NOT simply copy the color from the input image. The hijab color should be fashionable and harmonious ("sepadan") with the overall clothing style.` : '';
    
    const sizeInstruction = productSize ? `
**CRITICAL SIZING INSTRUCTION:** The product's estimated real-world size is: '${productSize}'. You MUST render the product at a natural and realistic scale relative to the model based on this size. A lipstick should fit in a hand; a coat should fit on a body. Avoid unnatural scaling.` : '';


    const prompts = poses.map(pose => {
        const getCreativeChoice = (choice: string, customChoice: string, type: 'outfit' | 'background' | 'mood' | 'lighting') => {
            if (choice === 'Kustom') return customChoice;
            if (choice === 'Mode Cerdas') return `The AI should choose a ${type} that is thematically appropriate`;
            if (choice === 'Sesuai Asli') return `The ${type} should be similar to the original`;
            return choice;
        };

        const finalPrompt = `You are an expert AI fashion photographer. Your task is to generate a new, professional-quality photoshoot image based on the provided assets.

**Primary Reference:**
- **Model's Identity:** Use the FIRST input image as the primary reference for the model's face, hair, and physical identity. It is crucial to maintain high facial consistency.
- **Product (if provided):** The SECOND input image (if present) is a product that the model should feature. Integrate it naturally into the pose. Product description: "${productDescription || 'none'}".
${hijabInstruction}
${sizeInstruction}
**Photoshoot Brief:**
- **Pose:** "${pose}"
- **Outfit:** ${getCreativeChoice(outfit, customOutfit, 'outfit')}.
- **Background:** ${getCreativeChoice(background, customBackground, 'background')}.
- **Ambiance & Lighting:** ${getCreativeChoice(lighting, '', 'lighting')} which creates a ${getCreativeChoice(mood, '', 'mood')} mood.

**Technical Specifications:**
- **Style:** Photorealistic, high-fashion magazine quality, highly detailed.
- **Additional Instructions:** ${additionalPrompt || 'None'}.
- **Negative Prompt (Things to AVOID):** ${consistency === 'custom' ? customNegativePrompt : (consistency === 'all' ? 'Do not change the outfit, product, or background from the original image.' : customNegativePrompt)}`;
        return { prompt: finalPrompt, pose };
    });

    return { isGenerateDisabled: isLoading || !!regeneratingIndex, generationPrompts: prompts };
  }, [state]);

  const handleGenerate = async (indexToRegen?: number) => {
    const isRegenerating = typeof indexToRegen === 'number';
    const promptsToRun = isRegenerating ? [generationPrompts[indexToRegen!]] : generationPrompts;

    if (!modelImage || promptsToRun.length === 0) return;

    if (isRegenerating) {
        dispatch({ type: 'REGENERATE_START', payload: indexToRegen! });
    } else {
        dispatch({ type: 'GENERATE_START' });
    }

    try {
        const tasks = promptsToRun.map(p => generateStyloImage(p.prompt, modelImage, productImage));
        const responses = await Promise.all(tasks);
        
        const newResults: StyloResult[] = responses.map((res, i) => ({
            imageUrl: res.imageUrl,
            prompt: promptsToRun[i].prompt,
            pose: promptsToRun[i].pose,
        }));

        if (isRegenerating) {
            dispatch({ type: 'REGENERATE_SUCCESS', payload: { index: indexToRegen!, result: newResults[0] }});
        } else {
            dispatch({ type: 'GENERATE_SUCCESS', payload: newResults });
        }
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Terjadi kesalahan tidak diketahui.';
        if (isRegenerating) {
            dispatch({ type: 'REGENERATE_ERROR', payload: error });
        } else {
            dispatch({ type: 'GENERATE_ERROR', payload: error });
        }
    }
  };

  const handleDownloadAll = useCallback(() => {
    results.forEach((result, index) => {
        const link = document.createElement('a');
        link.href = result.imageUrl;
        const safePose = result.pose.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `stylo-${index + 1}-${safePose}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  }, [results]);

  const handleVideoGenerationRequest = useCallback((result: StyloResult) => {
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

  
  const renderPoseConfig = () => {
      const handlePoseCountChange = (num: number) => {
        const clampedCount = Math.max(1, Math.min(10, isNaN(num) ? 1 : num));
        setField('poseCount', clampedCount);
        // If in AI agent mode, resize the custom poses array.
        if (poseMode === 'ai_agent') {
            setField('customPoses', Array(clampedCount).fill('').map((_, i) => customPoses[i] || ''));
        }
      };

      switch(poseMode) {
          case 'manual': return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Jumlah Pose</label>
                    <input type="number" value={poseCount} onChange={e => handlePoseCountChange(parseInt(e.target.value, 10))} onBlur={e => handlePoseCountChange(parseInt(e.target.value, 10))} min="1" max="10" className="w-20 p-1 bg-gray-700 border border-gray-600 rounded-md text-center"/>
                </div>
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Gaya Pose</label>
                    <select value={poseStyle} onChange={e => setField('poseStyle', e.target.value)} className="p-1 bg-gray-700 border border-gray-600 rounded-md">
                        <option>Elegan</option><option>Ceria</option><option>Sporty</option><option>Casual</option><option>Formal</option>
                    </select>
                </div>
            </div>
          );
          case 'preset': {
                const standardCategories = (Object.keys(PRESET_POSES) as Array<keyof typeof PRESET_POSES>).filter(cat => cat !== 'Promosi Cerdas ✨');
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Pilih kategori standar atau gunakan generator cerdas di bawah.</p>
        
                        {/* Promosi Cerdas Button */}
                        <button
                            onClick={() => dispatch({ type: 'OPEN_PROMO_MODAL' })}
                            className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg flex items-center justify-center gap-3 transform transition-all hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                        >
                            <SparklesIcon />
                            <div className="text-left flex-grow">
                                <p className="font-bold">Promosi Cerdas ✨</p>
                                <p className="text-xs opacity-90">AI akan membuatkan pose promosi untukmu</p>
                            </div>
                        </button>
        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {standardCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => dispatch({ type: 'OPEN_POSE_MODAL', payload: cat })}
                                    className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-left hover:border-indigo-500 transform hover:-translate-y-1 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <p className="font-semibold text-white text-sm">{cat}</p>
                                </button>
                            ))}
                        </div>
                        {selectedPresetPoses.length > 0 && (
                            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700">
                                <p className="text-sm font-semibold text-gray-300 mb-2">{selectedPresetPoses.length} Pose Dipilih:</p>
                                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside max-h-24 overflow-y-auto">
                                    {selectedPresetPoses.map((pose, index) => <li key={index} className="truncate">{pose}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            }
           case 'ai_agent': return (
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Jumlah Pose</label>
                      <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                              <button key={num} onClick={() => handlePoseCountChange(num)}
                                  className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-sm transform transition-all border-2 ${ poseCount === num ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:scale-110'}`}>
                                  {num}
                              </button>
                          ))}
                      </div>
                  </div>
                  <button onClick={handleGetAiRecommendations} disabled={!productImage || isRecommending} className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50">
                      <SparklesIcon/>{isRecommending ? "Mencari ide..." : "Rekomendasi AI"}
                  </button>
                  <div className="space-y-2">
                      {customPoses.map((pose, index) => (
                          <textarea key={index} value={pose} onChange={e => dispatch({type: 'UPDATE_CUSTOM_POSE', payload: {index, value: e.target.value}})} placeholder={`Deskripsi pose #${index + 1}...`}
                          className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm"
                          />
                      ))}
                  </div>
              </div>
          );
          default: return null;
      }
  };

  return (
      <div className="w-full font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Panel */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-6">
                {/* 1. Unggah Gambar */}
                <div>
                    <h3 className="font-bold text-lg text-white mb-4">1. Unggah Gambar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-white">Foto Model (Wajib)</label>
                            <ImageUploader onImageUpload={(img) => dispatch({type:'SET_MODEL_IMAGE', payload: img})} image={modelImage} enableCropper={true} />
                            {modelImage && (
                                <div className="mt-3 bg-gray-900/50 p-3 rounded-lg flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="hijab-toggle" 
                                        checked={modelWearsHijab} 
                                        onChange={(e) => setField('modelWearsHijab', e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="hijab-toggle" className="text-sm font-medium text-gray-300 cursor-pointer">
                                        Model saya mengenakan hijab
                                    </label>
                                </div>
                            )}
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-semibold text-white">Gambar Produk (Opsional)</label>
                            <ImageUploader onImageUpload={(img) => dispatch({type:'SET_PRODUCT_IMAGE', payload: img})} image={productImage} enableCropper={true} />
                            {productImage && (
                                <div className="relative mt-2">
                                    <textarea
                                        value={productDescription}
                                        onChange={e => dispatch({type:'SET_PRODUCT_DESCRIPTION', payload: e.target.value})}
                                        placeholder={isIdentifyingProduct ? "AI sedang mengidentifikasi..." : "Tulis nama produk..."}
                                        className="w-full h-20 p-2 pr-12 bg-gray-800 border border-gray-600 rounded-lg text-sm"
                                        disabled={isIdentifyingProduct || isUpdatingDescription}
                                    />
                                     {isIdentifyingProduct && (
                                        <div className="absolute top-2.5 right-2.5 p-1.5"><MiniSpinner /></div>
                                     )}
                                     {!isIdentifyingProduct && (
                                        <button
                                            onClick={handleExpandDescription}
                                            disabled={!productDescription.trim() || isUpdatingDescription}
                                            className="absolute top-2.5 right-2.5 p-1.5 bg-gray-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Perjelas dengan AI"
                                        >
                                            {isUpdatingDescription ? <MiniSpinner /> : <SparklesIcon />}
                                        </button>
                                     )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Konfigurasi Pose */}
                <div>
                    <h3 className="font-bold text-lg text-white mb-4">2. Konfigurasi Pose</h3>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <RadioPill label="AI Agent" value="ai_agent" name="pose" checked={poseMode === 'ai_agent'} onChange={(v) => handlePoseModeChange(v as PoseMode)}/>
                            <RadioPill label="Preset" value="preset" name="pose" checked={poseMode === 'preset'} onChange={(v) => handlePoseModeChange(v as PoseMode)}/>
                            <RadioPill label="Manual" value="manual" name="pose" checked={poseMode === 'manual'} onChange={(v) => handlePoseModeChange(v as PoseMode)}/>
                        </div>
                        <div>{renderPoseConfig()}</div>
                    </div>
                </div>
                
                {/* 3. Kustomisasi Visual */}
                <div>
                    <h3 className="font-bold text-lg text-white mb-4">3. Kustomisasi Visual</h3>
                    <div className="space-y-4">
                        <SelectInput label="Pakaian" value={outfit} onChange={e => setField('outfit', e.target.value)}>
                            {CREATIVE_OPTIONS.outfit.map(o => <option key={o}>{o}</option>)}
                        </SelectInput>
                        {outfit === 'Kustom' && <textarea value={customOutfit} onChange={e => setField('customOutfit', e.target.value)} className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm" />}
                        
                        <SelectInput label="Latar Belakang" value={background} onChange={e => setField('background', e.target.value)}>
                            {CREATIVE_OPTIONS.background.map(o => <option key={o}>{o}</option>)}
                        </SelectInput>
                        {background === 'Kustom' && <textarea value={customBackground} onChange={e => setField('customBackground', e.target.value)} className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm" />}

                        <SelectInput label="Suasana Hati (Mood)" value={mood} onChange={e => setField('mood', e.target.value)}>
                             {CREATIVE_OPTIONS.mood.map(o => <option key={o}>{o}</option>)}
                        </SelectInput>
                        
                        <SelectInput label="Pencahayaan" value={lighting} onChange={e => setField('lighting', e.target.value)}>
                           {CREATIVE_OPTIONS.lighting.map(o => <option key={o}>{o}</option>)}
                        </SelectInput>
                    </div>
                </div>

                {/* 4. Pengaturan Output */}
                 <div>
                    <h3 className="font-bold text-lg text-white mb-4">4. Pengaturan Output</h3>
                    <div className="space-y-4">
                        <textarea value={additionalPrompt} onChange={e => setField('additionalPrompt', e.target.value)} placeholder="Instruksi tambahan (contoh: tambahkan kacamata hitam)..."
                        className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-lg"/>
                         <p className="text-sm font-medium text-gray-300">Konsistensi & Prompt Negatif</p>
                         <div className="flex flex-wrap gap-2">
                            <RadioPill label="Konsisten Karakter" value="character" name="consistency" checked={consistency === 'character'} onChange={v => setField('consistency', v)}/>
                            <RadioPill label="Konsisten Semua" value="all" name="consistency" checked={consistency === 'all'} onChange={v => setField('consistency', v)}/>
                            <RadioPill label="Kustom" value="custom" name="consistency" checked={consistency === 'custom'} onChange={v => setField('consistency', v)}/>
                        </div>
                        <textarea value={customNegativePrompt} onChange={e => setField('customNegativePrompt', e.target.value)} placeholder="Hal-hal yang harus dihindari AI..."
                        className="w-full h-24 p-2 bg-gray-800 border border-gray-600 rounded-lg"/>
                    </div>
                 </div>

                <button onClick={() => handleGenerate()} disabled={isGenerateDisabled} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
                    <SparklesIcon/>{isLoading ? 'Memproses...' : `Hasilkan ${generationPrompts.length} Pose`}
                </button>
            </motion.div>
            
            {/* Right Panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[30rem] flex flex-col justify-center items-center">
                <AnimatePresence mode="wait">
                    {isLoading && <Loader message={loadingMessage}/>}
                    {error && !isLoading && (
                        <div className="text-center text-red-400">
                            <h3 className="font-bold text-lg">Oops! Terjadi Kesalahan</h3>
                            <p className="text-sm mt-2">{error}</p>
                            <button onClick={() => dispatch({type: 'GENERATE_ERROR', payload: ''})} className="mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">OK</button>
                        </div>
                    )}
                    {!isLoading && !error && results.length > 0 && (
                        <div className="w-full">
                            <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-white">Galeri Hasil</h2>
                                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                    {results.length > 1 && (
                                        <button
                                            onClick={handleDownloadAll}
                                            className="flex w-full sm:w-auto items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-green-500"
                                            title="Unduh semua gambar"
                                        >
                                            <DownloadIcon /> Unduh Semua
                                        </button>
                                    )}
                                    <button
                                        onClick={() => dispatch({type: 'START_OVER'})}
                                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-gray-500 w-full sm:w-auto flex justify-center"
                                    >
                                        Mulai Lagi
                                    </button>
                                </div>
                            </div>
                             <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
                                {results.map((res, i) => (
                                    <motion.button 
                                        key={i} 
                                        onClick={() => dispatch({type: 'SET_PREVIEW_INDEX', payload: i})}
                                        className="relative group aspect-[9/16] overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        <img src={res.imageUrl} alt={`Hasil Stylo ${i + 1}`} className="w-full h-full object-cover"/>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-lg font-bold">Lihat</span>
                                        </div>
                                         {regeneratingIndex === i && (
                                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-t-transparent"/>
                                                <p className="text-xs mt-2">Membuat ulang...</p>
                                            </div>
                                        )}
                                    </motion.button>
                                ))}
                             </div>
                        </div>
                    )}
                     {!isLoading && !error && results.length === 0 && (
                        <div className="text-center text-gray-500">
                             <h3 className="font-bold text-lg text-gray-400">Studio Foto Virtual Anda</h3>
                             <p className="text-sm mt-1 max-w-sm">Hasil foto model profesional Anda akan muncul di sini.</p>
                        </div>
                     )}
                </AnimatePresence>
            </motion.div>
        </div>
        <AnimatePresence>
            {previewIndex !== null && (
                <StyloPreviewModal
                    results={results}
                    currentIndex={previewIndex}
                    onClose={() => dispatch({ type: 'SET_PREVIEW_INDEX', payload: null })}
                    onNavigate={(newIndex) => dispatch({ type: 'SET_PREVIEW_INDEX', payload: newIndex })}
                    onRegenerate={() => handleGenerate(previewIndex)}
                    isRegenerating={regeneratingIndex === previewIndex}
                    onNavigateToApp={onNavigateToApp}
                    onUpdateVideoPrompt={handleUpdateVideoPrompt}
                    productDescription={productDescription}
                    onUpdatePromoScript={handleUpdatePromoScript}
                    onOpenVideoModal={() => handleVideoGenerationRequest(results[previewIndex!])}
                />
            )}
        </AnimatePresence>
        <AnimatePresence>
            {isPoseModalOpen && currentPoseCategory && (
                <PresetPoseModal
                    isOpen={isPoseModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_POSE_MODAL' })}
                    onSave={(poses) => dispatch({ type: 'SET_SELECTED_PRESET_POSES', payload: poses })}
                    categoryName={currentPoseCategory}
                    poses={PRESET_POSES[currentPoseCategory]}
                    initialSelectedPoses={selectedPresetPoses}
                />
            )}
        </AnimatePresence>
         <AnimatePresence>
            {isPromoModalOpen && (
                <SmartPromoModal
                    isOpen={isPromoModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_PROMO_MODAL' })}
                    onGeneratePoses={handleGeneratePromoPoses}
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
                  sourceImageAspectRatio="9:16" // Stylo outputs portrait images
              />
          )}
      </AnimatePresence>
      </div>
  );
};

export default StyloApp;