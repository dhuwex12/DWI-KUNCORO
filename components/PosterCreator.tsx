import React, { useReducer, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Import PosterConfig from the shared types file
import { UploadedImage, PosterConfig, CreativeConcept } from '../types';
import { identifyProduct, generateCopyForPoster, generatePosterIdeas, generatePoster } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import PosterPreviewModal from './PosterPreviewModal';
import { DownloadIcon } from './icons/DownloadIcon';
import DesignOptionsModal from './DesignOptionsModal'; // Import the new modal
import { ChevronDownIcon } from './icons/ChevronDownIcon'; // Import icon for triggers
import { InfoIcon } from './icons/InfoIcon';
import UploadTipsModal from './UploadTipsModal';
import PosterEditorModal from './PosterEditorModal'; // Import the new editor modal

// --- Constants & Types ---
const DESIGN_OPTIONS = {
  themes: [
    'Minimalis & Bersih', 'Modern & Berani', 'Elegan & Mewah', 'Ceria & Menyenangkan', 'Rustic & Alami', 
    'Vintage & Retro', 'Teknologi & Futuristik', 'Art Deco Glamor', 'Tipografi Swiss', 'Grunge & Urban', 
    'Gambar Tangan & Organik', 'Korporat & Profesional', 'Bohemian & Natural', 'Pop Art & Komik', 
    'Fokus pada Fotografi', 'Abstrak & Geometris', 'Surealis & Seperti Mimpi', 'Ramah Lingkungan & Hijau', 
    'Mewah Mode Gelap', 'Kolase & Scrapbook'
  ],
  colorPalettes: [
    'Otomatis dari Gambar', 'Energi Hangat (Merah, Oranye, Kuning)', 'Tenang & Dingin (Biru, Hijau, Ungu)',
    'Mewah & Elegan (Hitam, Emas, Perak)', 'Pastel Lembut (Pink Muda, Biru Langit, Mint)', 
    'Alam & Organik (Hijau Hutan, Coklat Tanah, Krem)', 'Monokromatik Berani (Hitam, Putih, Abu-abu)',
    'Neon & Cerah (Pink Neon, Hijau Limau, Biru Elektrik)', 'Gradien Senja (Ungu, Pink, Oranye)',
    'Profesional & Korporat (Biru Navy, Abu-abu, Putih)'
  ],
  fontStyles: [
    'Sans-Serif Bersih & Modern', 'Serif Klasik & Elegan', 'Script Kaligrafi & Personal', 
    'Display Tebal & Berdampak', 'Futuristik & Geometris', 'Tulisan Tangan Kasual & Ramah', 
    'Mewah & Dekoratif'
  ],
};

// FIX: CreativeConcept moved to types.ts

// FIX: Removed local PosterConfig definition, as it is now in types.ts

interface PosterResult {
  imageUrl: string;
  config: PosterConfig;
}

interface PosterCreatorState {
  sourceImage: UploadedImage | null;
  productName: string;
  isIdentifyingProduct: boolean;
  activeTab: 'manual' | 'auto';
  
  // Manual Config
  theme: string;
  colorPalette: string;
  fontStyle: string;
  headline: string;
  bodyText: string;
  cta: string;
  isGeneratingCopy: boolean;
  numberOfPosters: number;
  isAutoConfiguring: boolean; // New state for auto-fill

  // Auto Config
  creativeIdeas: CreativeConcept[] | null;
  isGeneratingIdeas: boolean;

  // Generation & Results
  isGeneratingPoster: boolean;
  posterResults: PosterResult[];
  posterError: string | null;
  previewIndex: number | null;
  regeneratingIndex: number | null;

  // Editor State
  editorState: {
    isOpen: boolean;
    imageUrl: string | null;
    config: PosterConfig | null;
  }
}

const initialState: PosterCreatorState = {
  sourceImage: null,
  productName: '',
  isIdentifyingProduct: false,
  activeTab: 'manual',
  theme: DESIGN_OPTIONS.themes[0],
  colorPalette: DESIGN_OPTIONS.colorPalettes[0],
  fontStyle: DESIGN_OPTIONS.fontStyles[0],
  headline: '',
  bodyText: '',
  cta: '',
  isGeneratingCopy: false,
  numberOfPosters: 1,
  isAutoConfiguring: false, // New state
  creativeIdeas: null,
  isGeneratingIdeas: false,
  isGeneratingPoster: false,
  posterResults: [],
  posterError: null,
  previewIndex: null,
  regeneratingIndex: null,
  editorState: {
      isOpen: false,
      imageUrl: null,
      config: null
  }
};

type Action =
  | { type: 'SET_SOURCE_IMAGE'; payload: UploadedImage | null }
  | { type: 'SET_FIELD'; payload: { field: keyof PosterCreatorState; value: any } }
  | { type: 'IDENTIFY_PRODUCT_START' }
  | { type: 'IDENTIFY_PRODUCT_SUCCESS'; payload: string }
  | { type: 'IDENTIFY_PRODUCT_ERROR' }
  | { type: 'GENERATE_COPY_START' }
  | { type: 'GENERATE_COPY_SUCCESS'; payload: { headline: string; bodyText: string; cta: string } }
  | { type: 'GENERATE_COPY_ERROR' }
  | { type: 'GENERATE_IDEAS_START' }
  | { type: 'GENERATE_IDEAS_SUCCESS'; payload: CreativeConcept[] }
  | { type: 'GENERATE_IDEAS_ERROR' }
  | { type: 'APPLY_CREATIVE_IDEA'; payload: CreativeConcept }
  | { type: 'AUTOCONFIG_START' } // New action
  | { type: 'AUTOCONFIG_SUCCESS'; payload: CreativeConcept } // New action
  | { type: 'AUTOCONFIG_ERROR'; payload: string } // New action
  | { type: 'GENERATE_POSTER_START' }
  | { type: 'GENERATE_POSTER_SUCCESS'; payload: PosterResult[] }
  | { type: 'GENERATE_POSTER_ERROR'; payload: string }
  | { type: 'REGENERATE_POSTER_START'; payload: number }
  | { type: 'REGENERATE_POSTER_SUCCESS'; payload: { index: number; imageUrl: string } }
  | { type: 'REGENERATE_POSTER_ERROR'; payload: { index: number; error: string } }
  | { type: 'SET_PREVIEW_INDEX', payload: number | null }
  | { type: 'OPEN_EDITOR'; payload: { imageUrl: string; config: PosterConfig } }
  | { type: 'CLOSE_EDITOR' }
  | { type: 'RESET' };

function reducer(state: PosterCreatorState, action: Action): PosterCreatorState {
  switch (action.type) {
    case 'SET_SOURCE_IMAGE':
      return { ...initialState, sourceImage: action.payload };
    case 'SET_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'IDENTIFY_PRODUCT_START':
      return { ...state, isIdentifyingProduct: true, productName: '' };
    case 'IDENTIFY_PRODUCT_SUCCESS':
      return { ...state, isIdentifyingProduct: false, productName: action.payload };
    case 'IDENTIFY_PRODUCT_ERROR':
      return { ...state, isIdentifyingProduct: false };
    case 'GENERATE_COPY_START':
      return { ...state, isGeneratingCopy: true, headline: '', bodyText: '', cta: '' };
    case 'GENERATE_COPY_SUCCESS':
      return { ...state, isGeneratingCopy: false, ...action.payload };
    case 'GENERATE_COPY_ERROR':
      return { ...state, isGeneratingCopy: false };
    case 'GENERATE_IDEAS_START':
        return { ...state, isGeneratingIdeas: true, creativeIdeas: null };
    case 'GENERATE_IDEAS_SUCCESS':
        return { ...state, isGeneratingIdeas: false, creativeIdeas: action.payload };
    case 'GENERATE_IDEAS_ERROR':
        return { ...state, isGeneratingIdeas: false };
    case 'APPLY_CREATIVE_IDEA':
        return { ...state, activeTab: 'manual', ...action.payload };
    case 'AUTOCONFIG_START':
        return { ...state, isAutoConfiguring: true, posterError: null };
    case 'AUTOCONFIG_SUCCESS':
        const concept = action.payload;
        return {
            ...state,
            isAutoConfiguring: false,
            theme: concept.theme,
            colorPalette: concept.colorPalette,
            fontStyle: concept.fontStyle,
            headline: concept.headline,
            bodyText: concept.bodyText,
            cta: concept.cta,
        };
    case 'AUTOCONFIG_ERROR':
        return { ...state, isAutoConfiguring: false, posterError: action.payload };
    case 'GENERATE_POSTER_START':
      return { ...state, isGeneratingPoster: true, posterResults: [], posterError: null };
    case 'GENERATE_POSTER_SUCCESS':
      return { ...state, isGeneratingPoster: false, posterResults: action.payload };
    case 'GENERATE_POSTER_ERROR':
        return { ...state, isGeneratingPoster: false, posterError: action.payload };
    case 'REGENERATE_POSTER_START':
      return { ...state, regeneratingIndex: action.payload, posterError: null };
    case 'REGENERATE_POSTER_SUCCESS': {
      const newResults = [...state.posterResults];
      newResults[action.payload.index] = { ...newResults[action.payload.index], imageUrl: action.payload.imageUrl };
      return { ...state, regeneratingIndex: null, posterResults: newResults };
    }
    case 'REGENERATE_POSTER_ERROR':
      return { ...state, regeneratingIndex: null, posterError: action.payload.error };
    case 'SET_PREVIEW_INDEX':
        return { ...state, previewIndex: action.payload };
    case 'OPEN_EDITOR':
        return { ...state, previewIndex: null, editorState: { isOpen: true, imageUrl: action.payload.imageUrl, config: action.payload.config } };
    case 'CLOSE_EDITOR':
        return { ...state, editorState: { isOpen: false, imageUrl: null, config: null } };
    case 'RESET':
        return initialState;
    default:
      return state;
  }
}

// --- Sub-components ---

const StepHeader: React.FC<{ number: number; title: string }> = ({ number, title }) => (
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white font-bold rounded-full">{number}</div>
    <h2 className="text-xl font-bold text-white">{title}</h2>
  </div>
);

const NumberSelector: React.FC<{ value: number; onChange: (value: number) => void; max?: number; }> = ({ value, onChange, max = 10 }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Jumlah Desain</label>
        <div className="flex flex-wrap gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map(num => (
                <button
                    key={num}
                    onClick={() => onChange(num)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-sm transition-colors border-2 ${
                        value === num
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
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


const CreativeIdeaCard: React.FC<{ concept: CreativeConcept; onApply: () => void }> = ({ concept, onApply }) => (
    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col justify-between transform transition-all hover:-translate-y-1 hover:shadow-lg">
        <div>
            <h4 className="font-bold text-indigo-400">{concept.conceptName}</h4>
            <p className="text-xs text-gray-400 mt-1 mb-2">{concept.conceptDescription}</p>
            <p className="text-sm font-semibold text-white">"{concept.headline}"</p>
        </div>
        <button onClick={onApply} className="mt-3 w-full text-sm bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-500 transition">
            Gunakan Ide Ini
        </button>
    </motion.div>
);

const PosterResultCard: React.FC<{ imageUrl: string; onPreview: () => void; }> = ({ imageUrl, onPreview }) => {
    return (
        <button onClick={onPreview} className="w-full aspect-[3/4] bg-gray-900/50 rounded-lg border border-gray-700 flex items-center justify-center relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <img src={imageUrl} alt="Generated Poster" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-md backdrop-blur-sm">Pratinjau</span>
            </div>
        </button>
    );
};

// --- Main Component ---
const PosterCreator: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    options: string[];
    currentValue: string;
    onSelect: (value: string) => void;
  } | null>(null);


  const handleImageUpload = useCallback((image: UploadedImage | null) => {
    dispatch({ type: 'SET_SOURCE_IMAGE', payload: image });
  }, []);
  
  useEffect(() => {
    if (state.sourceImage) {
      const processImage = async () => {
        dispatch({ type: 'IDENTIFY_PRODUCT_START' });
        try {
          const name = await identifyProduct(state.sourceImage!);
          dispatch({ type: 'IDENTIFY_PRODUCT_SUCCESS', payload: name });
        } catch (e) {
          dispatch({ type: 'IDENTIFY_PRODUCT_ERROR' });
        }
      };
      processImage();
    }
  }, [state.sourceImage]);

  useEffect(() => {
    if (state.productName && !state.isIdentifyingProduct) {
      const getCopy = async () => {
        dispatch({ type: 'GENERATE_COPY_START' });
        try {
          const copy = await generateCopyForPoster(state.productName);
          dispatch({ type: 'GENERATE_COPY_SUCCESS', payload: copy });
        } catch (e) {
          dispatch({ type: 'GENERATE_COPY_ERROR' });
        }
      };
      getCopy();
    }
  }, [state.productName, state.isIdentifyingProduct]);

  const handleGenerateIdeas = async () => {
      dispatch({ type: 'GENERATE_IDEAS_START' });
      try {
          const ideas = await generatePosterIdeas(state.productName, DESIGN_OPTIONS.themes, DESIGN_OPTIONS.colorPalettes, DESIGN_OPTIONS.fontStyles);
          dispatch({ type: 'GENERATE_IDEAS_SUCCESS', payload: ideas });
      } catch (e) {
          dispatch({ type: 'GENERATE_IDEAS_ERROR' });
      }
  };
  
  const handleAutoConfig = async () => {
    if (!state.productName) return;
    dispatch({ type: 'AUTOCONFIG_START' });
    try {
        // We only need one best idea, but the service gives three. We'll take the first one.
        const ideas = await generatePosterIdeas(state.productName, DESIGN_OPTIONS.themes, DESIGN_OPTIONS.colorPalettes, DESIGN_OPTIONS.fontStyles);
        if (ideas && ideas.length > 0) {
            dispatch({ type: 'AUTOCONFIG_SUCCESS', payload: ideas[0] });
        } else {
            throw new Error("AI tidak memberikan ide.");
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Terjadi kesalahan tidak diketahui.';
        dispatch({ type: 'AUTOCONFIG_ERROR', payload: `Gagal mendapatkan konfigurasi otomatis: ${errorMsg}` });
    }
  };

  const handleGeneratePoster = async () => {
    if (!state.sourceImage || !state.productName) return;
    dispatch({ type: 'GENERATE_POSTER_START' });
    
    const generationConfig: PosterConfig = {
      product_name: state.productName,
      theme: state.theme,
      color_palette: state.colorPalette,
      font_style: state.fontStyle,
      headline: state.headline,
      body_text: state.bodyText,
      cta: state.cta,
    };

    try {
      const generationTasks = Array.from({ length: state.numberOfPosters }).map(() =>
        generatePoster(state.sourceImage!, generationConfig)
      );
      const results = await Promise.all(generationTasks);
      
      const posterResults: PosterResult[] = results.map(res => ({
        imageUrl: res.imageUrl,
        config: generationConfig
      }));

      dispatch({ type: 'GENERATE_POSTER_SUCCESS', payload: posterResults });
    } catch(err) {
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      dispatch({ type: 'GENERATE_POSTER_ERROR', payload: errorMsg });
    }
  };
  
  const handleRegeneratePoster = async (index: number) => {
    const resultToRegen = state.posterResults[index];
    if (!state.sourceImage || !resultToRegen) return;

    dispatch({ type: 'REGENERATE_POSTER_START', payload: index });

    try {
      const result = await generatePoster(state.sourceImage, resultToRegen.config);
      dispatch({ type: 'REGENERATE_POSTER_SUCCESS', payload: { index, imageUrl: result.imageUrl } });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      dispatch({ type: 'REGENERATE_POSTER_ERROR', payload: { index, error: `Gagal membuat ulang. ${errorMsg}` } });
    }
  };

  const handleOpenEditor = (index: number) => {
    const result = state.posterResults[index];
    if (result) {
        dispatch({ type: 'OPEN_EDITOR', payload: { imageUrl: result.imageUrl, config: result.config } });
    }
  };


  const handleDownloadAll = () => {
    state.posterResults.forEach((result, index) => {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `poster-design-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const openOptionsModal = (title: string, options: string[], currentValue: string, field: keyof PosterCreatorState) => {
    setModalState({
        isOpen: true,
        title,
        options,
        currentValue,
        onSelect: (value: string) => {
            dispatch({ type: 'SET_FIELD', payload: { field, value } });
            setModalState(null);
        }
    });
  };

  const isGenerateDisabled = !state.sourceImage || !state.productName || state.isGeneratingPoster;
  const hasResults = state.posterResults.length > 0;

  const OptionTrigger: React.FC<{label: string, value: string, onClick: () => void}> = ({ label, value, onClick }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <button onClick={onClick} className="w-full flex justify-between items-center p-2 bg-gray-700 border border-gray-600 rounded-lg text-left hover:border-indigo-500 transform transition-all hover:scale-105">
        <span className="truncate">{value}</span>
        <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </button>
    </div>
  );

  const renderResults = () => {
    const count = state.posterResults.length;
    
    if (count === 1) {
      return (
        <div className="w-full max-w-md mx-auto">
          <PosterResultCard
            imageUrl={state.posterResults[0].imageUrl}
            onPreview={() => dispatch({ type: 'SET_PREVIEW_INDEX', payload: 0 })}
          />
        </div>
      );
    }

    let gridClasses = 'grid gap-4 ';
    if (count === 2) {
      gridClasses += 'grid-cols-1 sm:grid-cols-2';
    } else { // 3 or more
      gridClasses += 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }

    return (
      <div className={gridClasses}>
        {state.posterResults.map((result, index) => (
          <PosterResultCard
            key={index}
            imageUrl={result.imageUrl}
            onPreview={() => dispatch({ type: 'SET_PREVIEW_INDEX', payload: index })}
          />
        ))}
      </div>
    );
  };


  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Panel */}
        <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-6 w-full">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <StepHeader number={1} title="Sumber Gambar" />
                <button onClick={() => setIsTipsModalOpen(true)} className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    <InfoIcon className="w-4 h-4" />
                    Tips Upload
                </button>
            </div>
            <ImageUploader onImageUpload={handleImageUpload} image={state.sourceImage} enableCropper={true} />
          </div>

          <div className="space-y-2">
            <StepHeader number={2} title="Nama Produk" />
            <div className="relative">
                <input type="text" value={state.productName} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'productName', value: e.target.value } })}
                    placeholder={state.isIdentifyingProduct ? "AI sedang mengidentifikasi..." : "Contoh: Sepatu Lari Pro"}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg" disabled={state.isIdentifyingProduct} />
                {state.isIdentifyingProduct && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-dashed rounded-full animate-spin border-t-transparent"></div>}
            </div>
          </div>

          <div className="space-y-4">
            <StepHeader number={3} title="Konfigurasi Desain" />
            <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700">
              <button onClick={() => dispatch({ type: 'SET_FIELD', payload: { field: 'activeTab', value: 'manual' } })} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition ${state.activeTab === 'manual' ? 'bg-indigo-600' : ''}`}>Manual</button>
              <button onClick={() => dispatch({ type: 'SET_FIELD', payload: { field: 'activeTab', value: 'auto' } })} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition ${state.activeTab === 'auto' ? 'bg-indigo-600' : ''}`}>Otomatis</button>
            </div>
            
            {state.activeTab === 'manual' ? (
                <div className="space-y-4 p-4 bg-gray-900/30 rounded-lg">
                    <NumberSelector value={state.numberOfPosters} onChange={(val) => dispatch({ type: 'SET_FIELD', payload: { field: 'numberOfPosters', value: val }})} />
                     <button
                        onClick={handleAutoConfig}
                        disabled={state.isAutoConfiguring || !state.productName || state.isIdentifyingProduct}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2.5 px-3 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        <SparklesIcon />
                        {state.isAutoConfiguring ? 'Mencari Desain Terbaik...' : 'Isi Otomatis dengan AI'}
                    </button>
                    <div className="border-t border-gray-700 pt-4 space-y-4">
                        <OptionTrigger 
                            label="Tema & Gaya Desain" 
                            value={state.theme} 
                            onClick={() => openOptionsModal('Pilih Tema & Gaya Desain', DESIGN_OPTIONS.themes, state.theme, 'theme')}
                        />
                        <OptionTrigger 
                            label="Palet Warna" 
                            value={state.colorPalette} 
                            onClick={() => openOptionsModal('Pilih Palet Warna', DESIGN_OPTIONS.colorPalettes, state.colorPalette, 'colorPalette')}
                        />
                         <OptionTrigger 
                            label="Inspirasi Gaya Font" 
                            value={state.fontStyle} 
                            onClick={() => openOptionsModal('Pilih Inspirasi Gaya Font', DESIGN_OPTIONS.fontStyles, state.fontStyle, 'fontStyle')}
                        />
                    </div>
                    <div className="border-t border-gray-700 pt-4 space-y-4">
                         <p className="text-sm font-medium text-gray-300 -mb-2">Teks untuk Poster</p>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Judul Utama (Headline)</label>
                            <input type="text" value={state.headline} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'headline', value: e.target.value } })} placeholder={state.isGeneratingCopy ? 'Membuat draf headline...' : 'Tulis headline Anda'} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg" />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Teks Isi (Opsional)</label>
                            <input type="text" value={state.bodyText} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'bodyText', value: e.target.value } })} placeholder={state.isGeneratingCopy ? 'Membuat draf teks...' : 'Tulis teks singkat di sini'} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg" />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Ajakan Bertindak (CTA)</label>
                            <input type="text" value={state.cta} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'cta', value: e.target.value } })} placeholder={state.isGeneratingCopy ? 'Membuat draf CTA...' : 'Contoh: Beli Sekarang'} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg" />
                         </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-gray-900/30 rounded-lg space-y-4">
                    <button onClick={handleGenerateIdeas} disabled={state.isGeneratingIdeas || !state.productName} className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2.5 px-3 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50">
                        {state.isGeneratingIdeas ? 'Mencari Ide...' : 'Buat Ide Kreatif'}
                    </button>
                    {state.isGeneratingIdeas && <div className="text-center text-sm text-gray-400">AI sedang memikirkan konsep...</div>}
                    {state.creativeIdeas && (
                        <div className="grid grid-cols-2 gap-3">
                            {state.creativeIdeas.map((idea, i) => <CreativeIdeaCard key={i} concept={idea} onApply={() => dispatch({type: 'APPLY_CREATIVE_IDEA', payload: idea})} />)}
                        </div>
                    )}
                </div>
            )}
          </div>
          <button onClick={handleGeneratePoster} disabled={isGenerateDisabled} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
            <SparklesIcon />{state.isGeneratingPoster ? 'Membuat Poster...' : `Buat ${state.activeTab === 'manual' ? state.numberOfPosters : ''} Poster`}
          </button>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 lg:sticky top-8 flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between">
                <StepHeader number={4} title="Hasil Poster Anda" />
                {hasResults && (
                    <button onClick={handleDownloadAll} className="flex items-center gap-2 text-sm bg-green-600 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-green-500 transition">
                        <DownloadIcon /> Unduh Semua
                    </button>
                )}
            </div>
             <div className="w-full">
                {state.isGeneratingPoster && (
                    <div className="w-full aspect-[3/4] bg-gray-900/50 rounded-lg border border-gray-700 flex items-center justify-center relative overflow-hidden">
                        <Loader message="AI sedang mendesain..." />
                    </div>
                )}
                {!state.isGeneratingPoster && state.posterError && (
                    <div className="w-full aspect-[3/4] bg-gray-900/50 rounded-lg border border-red-500/50 flex items-center justify-center p-4">
                        <div className="text-center text-red-400 text-sm">
                            <p className="font-bold">Gagal Membuat Poster</p>
                            <p>{state.posterError}</p>
                        </div>
                    </div>
                )}
                {!state.isGeneratingPoster && state.posterResults.length > 0 && (
                     renderResults()
                )}
                {!state.isGeneratingPoster && state.posterResults.length === 0 && !state.posterError && (
                    <div className="w-full aspect-[3/4] bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center p-4 text-center text-gray-500">
                        <div>
                            <h4 className="font-bold text-lg">Hasil Poster Anda</h4>
                            <p className="text-sm">Akan muncul di sini setelah dibuat.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
      <AnimatePresence>
        {state.previewIndex !== null && state.posterResults.length > 0 && (
            <PosterPreviewModal 
                imageUrls={state.posterResults.map(r => r.imageUrl)}
                currentIndex={state.previewIndex}
                onClose={() => dispatch({type: 'SET_PREVIEW_INDEX', payload: null})}
                onNavigate={(newIndex) => dispatch({type: 'SET_PREVIEW_INDEX', payload: newIndex})}
                onRegenerate={() => handleRegeneratePoster(state.previewIndex!)}
                isRegenerating={state.regeneratingIndex === state.previewIndex}
                onEdit={() => handleOpenEditor(state.previewIndex!)}
            />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {state.editorState.isOpen && (
            <PosterEditorModal
                isOpen={state.editorState.isOpen}
                onClose={() => dispatch({type: 'CLOSE_EDITOR'})}
                imageUrl={state.editorState.imageUrl!}
                initialConfig={state.editorState.config!}
                sourceImage={state.sourceImage}
            />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modalState?.isOpen && (
            <DesignOptionsModal
              isOpen={modalState.isOpen}
              onClose={() => setModalState(null)}
              title={modalState.title}
              options={modalState.options}
              currentValue={modalState.currentValue}
              onSelect={modalState.onSelect}
            />
        )}
      </AnimatePresence>
       <AnimatePresence>
        {isTipsModalOpen && (
            <UploadTipsModal onClose={() => setIsTipsModalOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default PosterCreator;