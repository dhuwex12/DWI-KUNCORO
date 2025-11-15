import React, { useReducer, useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedImage, CreativeDirection, AdGenResult, Scene } from '../types';
// FIX: Removed unused and non-existent imports.
import { generateAdStoryboard, visualizeScene, generateVideo, checkVideoStatus } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { VideoIcon } from './icons/VideoIcon';
import { FilmIcon } from './icons/FilmIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';


// --- Types ---
interface Storyboard {
  fullScript: string;
  musicRecommendations: string[];
  scenes: Scene[];
}

// --- State & Reducer ---
interface ScriptGenState {
  productImage: UploadedImage | null;
  modelImage: UploadedImage | null;
  creativeDirection: CreativeDirection;
  customTargetAudience: string;
  customVibe: string;
  duration: number;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  result: AdGenResult | null;
  
  // New storyboard workflow states
  sceneImageUrls: Record<number, string | null>;
  visualizingScenes: Set<number>;
  sceneVideoUrls: Record<number, string | null>;
  generatingVideoScenes: Set<number>;
  videoOperations: Record<number, any>;
}

const initialState: ScriptGenState = {
  productImage: null,
  modelImage: null,
  creativeDirection: {
    targetAudience: 'Milenial Aktif',
    vibe: 'Energik & Menyenangkan',
    lighting: 'Mode Cerdas',
    contentType: 'Bercerita',
  },
  customTargetAudience: '',
  customVibe: '',
  duration: 15,
  isLoading: false,
  loadingMessage: 'Menganalisis produk Anda...',
  error: null,
  result: null,
  sceneImageUrls: {},
  visualizingScenes: new Set(),
  sceneVideoUrls: {},
  generatingVideoScenes: new Set(),
  videoOperations: {},
};

type ScriptGenAction =
  | { type: 'SET_IMAGE'; payload: { field: 'productImage' | 'modelImage', image: UploadedImage | null } }
  | { type: 'SET_DIRECTION'; payload: { field: keyof CreativeDirection; value: string } }
  | { type: 'SET_CUSTOM_DIRECTION_FIELD'; payload: { field: 'customTargetAudience' | 'customVibe'; value: string } }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: AdGenResult }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'VISUALIZE_SCENE_START'; payload: number }
  | { type: 'VISUALIZE_SCENE_SUCCESS'; payload: { scene_number: number; imageUrl: string } }
  | { type: 'VISUALIZE_SCENE_ERROR'; payload: { scene_number: number } }
  | { type: 'GENERATE_VIDEO_START'; payload: number }
  | { type: 'SET_VIDEO_OPERATION'; payload: { scene_number: number; operation: any } }
  | { type: 'GENERATE_VIDEO_SUCCESS'; payload: { scene_number: number; videoUrl: string } }
  | { type: 'GENERATE_VIDEO_ERROR'; payload: { scene_number: number; error: string } }
  | { type: 'START_OVER' };

function scriptGenReducer(state: ScriptGenState, action: ScriptGenAction): ScriptGenState {
  switch (action.type) {
    case 'SET_IMAGE':
        if (action.payload.field === 'productImage') {
             return { ...initialState, productImage: action.payload.image, duration: state.duration, creativeDirection: state.creativeDirection, customTargetAudience: '', customVibe: '' };
        }
        return { ...state, [action.payload.field]: action.payload.image };
    case 'SET_DIRECTION': return { ...state, creativeDirection: { ...state.creativeDirection, [action.payload.field]: action.payload.value } };
    case 'SET_CUSTOM_DIRECTION_FIELD': return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_DURATION': return { ...state, duration: action.payload };
    case 'GENERATE_START': return { ...state, isLoading: true, error: null, result: null, loadingMessage: 'Menganalisis produk Anda...' };
    case 'GENERATE_SUCCESS': return { ...state, isLoading: false, result: action.payload };
    case 'GENERATE_ERROR': return { ...state, isLoading: false, error: action.payload };
    case 'VISUALIZE_SCENE_START': {
        const newSet = new Set(state.visualizingScenes);
        newSet.add(action.payload);
        return { ...state, visualizingScenes: newSet };
    }
    case 'VISUALIZE_SCENE_SUCCESS': {
        const newSet = new Set(state.visualizingScenes);
        newSet.delete(action.payload.scene_number);
        return {
            ...state,
            visualizingScenes: newSet,
            sceneImageUrls: { ...state.sceneImageUrls, [action.payload.scene_number]: action.payload.imageUrl },
        };
    }
     case 'VISUALIZE_SCENE_ERROR': {
        const newSet = new Set(state.visualizingScenes);
        newSet.delete(action.payload.scene_number);
        return {
            ...state,
            visualizingScenes: newSet,
            sceneImageUrls: { ...state.sceneImageUrls, [action.payload.scene_number]: 'error' },
        };
    }
    case 'GENERATE_VIDEO_START': {
        const newSet = new Set(state.generatingVideoScenes);
        newSet.add(action.payload);
        return { ...state, generatingVideoScenes: newSet };
    }
    case 'SET_VIDEO_OPERATION':
        return { ...state, videoOperations: { ...state.videoOperations, [action.payload.scene_number]: action.payload.operation } };
    case 'GENERATE_VIDEO_SUCCESS': {
        const newSet = new Set(state.generatingVideoScenes);
        newSet.delete(action.payload.scene_number);
        const newOps = { ...state.videoOperations };
        delete newOps[action.payload.scene_number];
        return {
            ...state,
            generatingVideoScenes: newSet,
            sceneVideoUrls: { ...state.sceneVideoUrls, [action.payload.scene_number]: action.payload.videoUrl },
            videoOperations: newOps,
        };
    }
    case 'GENERATE_VIDEO_ERROR': {
        const newSet = new Set(state.generatingVideoScenes);
        newSet.delete(action.payload.scene_number);
        const newOps = { ...state.videoOperations };
        delete newOps[action.payload.scene_number];
        return {
            ...state,
            generatingVideoScenes: newSet,
            sceneVideoUrls: { ...state.sceneVideoUrls, [action.payload.scene_number]: 'error' },
            videoOperations: newOps,
        };
    }
    case 'START_OVER': return { ...initialState, creativeDirection: state.creativeDirection, duration: state.duration, customTargetAudience: '', customVibe: '' };
    default: return state;
  }
}

// --- Helper & Sub-Components ---

const SelectInput: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <select value={value} onChange={onChange} className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
      {children}
    </select>
  </div>
);

const ShotTypeIcon: React.FC<{ type: 'product' | 'model' }> = ({ type }) => (
    type === 'product' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    )
);

const SceneCard: React.FC<{
    scene: Scene;
    imageUrl: string | null | 'error';
    videoUrl: string | null | 'error';
    isVisualizing: boolean;
    isGeneratingVideo: boolean;
    onGenerateVideo: () => void;
    onRegenerateVisual: () => void;
}> = ({ scene, imageUrl, videoUrl, isVisualizing, isGeneratingVideo, onGenerateVideo, onRegenerateVisual }) => {
    
    const renderMediaArea = () => {
        const canRegenerate = !isVisualizing && (imageUrl !== null);

        if (isVisualizing) {
            return <div className="w-full h-full flex flex-col items-center justify-center text-center"><Loader message="Membuat visual..." /><p className="text-xs mt-2 text-gray-500">Ini mungkin butuh waktu...</p></div>;
        }
        if (imageUrl === 'error') {
            return <div className="w-full h-full flex flex-col gap-2 items-center justify-center text-center text-red-400 text-sm">
                Gagal membuat visual.
                <button onClick={onRegenerateVisual} className="flex items-center gap-1 bg-gray-700 text-white text-xs px-2 py-1 rounded-md hover:bg-gray-600"><RegenerateIcon /> Coba Lagi</button>
            </div>;
        }
        if (imageUrl) {
            return (
                <div className="w-full h-full relative group">
                    {videoUrl ? (
                         videoUrl === 'error' ? (
                            <div className="w-full h-full flex items-center justify-center text-center text-red-400 text-sm">Gagal membuat video.</div>
                         ) : (
                            <video src={videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                         )
                    ) : (
                        <img src={imageUrl} alt={`Visual untuk adegan ${scene.scene_number}`} className="w-full h-full object-cover" />
                    )}
                    {isGeneratingVideo && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center">
                            <Loader message="Merender video..." />
                            <p className="text-xs mt-2 text-gray-500">Bisa memakan beberapa menit...</p>
                        </div>
                    )}
                    {canRegenerate && !isGeneratingVideo && !videoUrl && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button onClick={onRegenerateVisual} className="flex items-center gap-2 bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30"><RegenerateIcon /> Ulangi Visual</button>
                        </div>
                    )}
                </div>
            );
        }
        return <div className="w-full h-full flex items-center justify-center text-gray-600"><FilmIcon /></div>;
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 rounded-lg border border-gray-700 flex flex-col"
        >
            <div className="w-full aspect-[9/16] bg-gray-900 rounded-t-lg overflow-hidden">
                {renderMediaArea()}
            </div>
            <div className="p-4 flex flex-col gap-3 flex-grow">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg text-indigo-400">Adegan {scene.scene_number}</h4>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${scene.scene_type === 'product_shot' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                        <ShotTypeIcon type={scene.scene_type === 'product_shot' ? 'product' : 'model'} />
                        {scene.scene_type === 'product_shot' ? 'Shot Produk' : 'Shot Model'}
                    </span>
                </div>
                <p className="text-sm text-gray-400 flex-grow"><strong className="text-gray-300">Visual:</strong> {scene.visual_description}</p>
                {imageUrl && imageUrl !== 'error' && !isVisualizing && !videoUrl && (
                    <button onClick={onGenerateVideo} disabled={isGeneratingVideo} className="mt-auto w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-3 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
                        <VideoIcon />{isGeneratingVideo ? 'Memproses...' : 'Buat Video'}
                    </button>
                )}
            </div>
        </motion.div>
    );
};

// --- Main App Component ---
const ScriptGenerator: React.FC = () => {
  const [state, dispatch] = useReducer(scriptGenReducer, initialState);
  const { productImage, modelImage, creativeDirection, customTargetAudience, customVibe, duration, isLoading, error, result, sceneImageUrls, visualizingScenes, sceneVideoUrls, generatingVideoScenes, videoOperations } = state;
  const pollingIntervalsRef = useRef<Record<number, number>>({});

  const handleGenerate = useCallback(async () => {
    if (!productImage) return;
    dispatch({ type: 'GENERATE_START' });

    const finalCreativeDirection: CreativeDirection = {
        ...creativeDirection,
        targetAudience: creativeDirection.targetAudience === 'Custom' ? customTargetAudience : creativeDirection.targetAudience,
        vibe: creativeDirection.vibe === 'Custom' ? customVibe : creativeDirection.vibe,
        duration: duration,
        aspectRatio: '9:16' // Default aspect ratio as there is no UI for it
    };

    try {
      // FIX: The second argument must be a CreativeDirection object, not a string.
      const response = await generateAdStoryboard(productImage, finalCreativeDirection, modelImage);
      dispatch({ type: 'GENERATE_SUCCESS', payload: response });
      if (response?.mainStoryboard?.fullScript) {
        sessionStorage.setItem('script-generator-output', JSON.stringify(response.mainStoryboard));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      dispatch({ type: 'GENERATE_ERROR', payload: message });
    }
  }, [productImage, modelImage, creativeDirection, duration, customTargetAudience, customVibe]);

  // FIX: Renamed local function from `visualizeScene` to `handleVisualizeScene` to avoid shadowing the imported service function. This was causing an infinite recursive loop.
  const handleVisualizeScene = useCallback(async (scene: Scene) => {
    if (!productImage) return;
    dispatch({ type: 'VISUALIZE_SCENE_START', payload: scene.scene_number });
    try {
        const modelToUse = scene.scene_type === 'model_shot' ? modelImage : null;
        const response = await visualizeScene(scene.visual_description, productImage, modelToUse);
        // FIX: Changed cast to direct property access since visualizeScene is strongly typed.
        dispatch({ type: 'VISUALIZE_SCENE_SUCCESS', payload: { scene_number: scene.scene_number, imageUrl: response.imageUrl } });
    } catch (err) {
        dispatch({ type: 'VISUALIZE_SCENE_ERROR', payload: { scene_number: scene.scene_number } });
    }
  }, [productImage, modelImage]);
  
  const handleVisualizeAll = useCallback(async () => {
    if (!result) return;
    await Promise.allSettled(result.mainStoryboard.scenes.map(scene => handleVisualizeScene(scene)));
  }, [result, handleVisualizeScene]);

  const handleVisualizeOneByOne = useCallback(async () => {
    if (!result) return;
    for (const scene of result.mainStoryboard.scenes) {
        await handleVisualizeScene(scene);
    }
  }, [result, handleVisualizeScene]);
  
  const handleRegenerateVisual = useCallback(async (scene: Scene) => {
    await handleVisualizeScene(scene);
  }, [handleVisualizeScene]);

  const handleGenerateVideo = useCallback(async (scene: Scene) => {
    const imageUrl = sceneImageUrls[scene.scene_number];
    if (!imageUrl || imageUrl === 'error') return;

    dispatch({ type: 'GENERATE_VIDEO_START', payload: scene.scene_number });

    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (!base64data) throw new Error("Gagal membaca data gambar.");

            const sceneImage: UploadedImage = { base64: base64data, mimeType: blob.type, name: `scene_${scene.scene_number}.png` };
            
            const initialOp = await generateVideo(scene.visual_description, '9:16', sceneImage, false);
            dispatch({ type: 'SET_VIDEO_OPERATION', payload: { scene_number: scene.scene_number, operation: initialOp } });
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memulai pembuatan video.';
        dispatch({ type: 'GENERATE_VIDEO_ERROR', payload: { scene_number: scene.scene_number, error: message } });
    }
  }, [sceneImageUrls]);

  useEffect(() => {
    Object.entries(videoOperations).forEach(async ([sceneNumStr, op]) => {
        const sceneNum = parseInt(sceneNumStr, 10);
        if (op && !(op as any).done && !pollingIntervalsRef.current[sceneNum]) {
            pollingIntervalsRef.current[sceneNum] = window.setInterval(async () => {
                try {
                    const updatedOp = await checkVideoStatus(op);
                    if (updatedOp.done) {
                        clearInterval(pollingIntervalsRef.current[sceneNum]);
                        delete pollingIntervalsRef.current[sceneNum];
                        
                        const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if (!downloadLink) throw new Error("Operasi selesai tetapi tidak ada link video.");
                        
                        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                        if (!videoResponse.ok) throw new Error(`Gagal mengunduh video: ${videoResponse.statusText}`);
                        
                        const videoBlob = await videoResponse.blob();
                        const blobUrl = URL.createObjectURL(videoBlob);
                        dispatch({ type: 'GENERATE_VIDEO_SUCCESS', payload: { scene_number: sceneNum, videoUrl: blobUrl } });
                    } else {
                        dispatch({ type: 'SET_VIDEO_OPERATION', payload: { scene_number: sceneNum, operation: updatedOp } });
                    }
                } catch (err) {
                    clearInterval(pollingIntervalsRef.current[sceneNum]);
                    delete pollingIntervalsRef.current[sceneNum];
                    const message = err instanceof Error ? err.message : 'Gagal memeriksa status video.';
                    dispatch({ type: 'GENERATE_VIDEO_ERROR', payload: { scene_number: sceneNum, error: message } });
                }
            }, 10000);
        }
    });

    return () => {
        Object.values(pollingIntervalsRef.current).forEach(clearInterval);
    };
  }, [videoOperations]);

  const isGenerateDisabled = isLoading || !productImage;
  const scenes = result?.mainStoryboard?.scenes;
  const isVisualizing = visualizingScenes.size > 0;

  return (
    <div className="flex flex-col gap-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/3 space-y-4">
            <h2 className="text-xl font-bold text-white">1. Unggah Aset</h2>
            <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Foto Produk (Wajib)</label>
                <ImageUploader onImageUpload={(img) => dispatch({ type: 'SET_IMAGE', payload: { field: 'productImage', image: img }})} image={productImage} />
            </div>
             <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Foto Model (Opsional)</label>
                <ImageUploader onImageUpload={(img) => dispatch({ type: 'SET_IMAGE', payload: { field: 'modelImage', image: img }})} image={modelImage} />
            </div>
          </div>
          <div className="lg:w-2/3 space-y-4">
             <h2 className="text-xl font-bold text-white">2. Tentukan Arah Kreatif</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <SelectInput label="Target Audiens" value={creativeDirection.targetAudience} onChange={(e) => dispatch({type: 'SET_DIRECTION', payload: {field: 'targetAudience', value: e.target.value}})}>
                        <option>Gen Z Trendsetter</option><option>Milenial Aktif</option><option>Profesional Muda</option><option>Keluarga Modern</option><option>Custom</option>
                    </SelectInput>
                    {creativeDirection.targetAudience === 'Custom' && (
                        <input
                            type="text"
                            value={customTargetAudience}
                            onChange={(e) => dispatch({type: 'SET_CUSTOM_DIRECTION_FIELD', payload: {field: 'customTargetAudience', value: e.target.value}})}
                            placeholder="Cth: Gamers kompetitif usia 18-25"
                            className="w-full mt-2 p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-1 focus:ring-indigo-500"
                        />
                    )}
                </div>
                <div>
                    <SelectInput label="Vibe" value={creativeDirection.vibe} onChange={(e) => dispatch({type: 'SET_DIRECTION', payload: {field: 'vibe', value: e.target.value}})}>
                        <option>Energik & Menyenangkan</option><option>Sinematik & Epik</option><option>Modern & Bersih</option><option>Alami & Organik</option><option>Custom</option>
                    </SelectInput>
                     {creativeDirection.vibe === 'Custom' && (
                        <input
                            type="text"
                            value={customVibe}
                            onChange={(e) => dispatch({type: 'SET_CUSTOM_DIRECTION_FIELD', payload: {field: 'customVibe', value: e.target.value}})}
                            placeholder="Cth: Nuansa nostalgia tahun 90-an"
                            className="w-full mt-2 p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-1 focus:ring-indigo-500"
                        />
                    )}
                </div>
                <SelectInput label="Pencahayaan" value={creativeDirection.lighting} onChange={(e) => dispatch({type: 'SET_DIRECTION', payload: {field: 'lighting', value: e.target.value}})}>
                    <option>Mode Cerdas</option><option>Lampu Studio</option><option>Dramatis</option><option>Cahaya Alami</option><option>Neon</option>
                </SelectInput>
                 <SelectInput label="Tipe Konten" value={creativeDirection.contentType} onChange={(e) => dispatch({type: 'SET_DIRECTION', payload: {field: 'contentType', value: e.target.value}})}>
                    <option>Bercerita</option><option>Penjualan Langsung</option><option>Softselling</option><option>Masalah/Solusi</option><option>Unboxing</option>
                </SelectInput>
                <SelectInput label="Durasi Iklan" value={duration} onChange={(e) => dispatch({type: 'SET_DURATION', payload: Number(e.target.value)})}>
                    <option value="15">~15 Detik (2 Adegan)</option>
                    <option value="30">~30 Detik (4 Adegan)</option>
                    <option value="45">~45 Detik (6 Adegan)</option>
                    <option value="60">~60 Detik (8 Adegan)</option>
                </SelectInput>
            </div>
            <button onClick={handleGenerate} disabled={isGenerateDisabled}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
                <SparklesIcon />{isLoading ? 'Menciptakan Naskah...' : 'Buat Storyboard Iklan'}
            </button>
          </div>
        </motion.div>

      <AnimatePresence>
        {isLoading && <div className="flex justify-center"><Loader message="AI sedang merancang storyboard..." /></div>}
        {error && <div className="text-center text-red-400 font-semibold">{error}</div>}
        {result && !isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-3xl font-bold text-white">Hasil Storyboard Anda</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button onClick={handleVisualizeOneByOne} disabled={isVisualizing} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all hover:bg-gray-600 disabled:bg-gray-600 disabled:opacity-50 text-sm">
                           Visualisasikan Satu per Satu
                        </button>
                        <button onClick={handleVisualizeAll} disabled={isVisualizing} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50">
                            <SparklesIcon /> {isVisualizing ? `Memproses (${visualizingScenes.size})...` : 'Visualisasikan Semua'}
                        </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* // FIX: Add explicit type to the 'scene' parameter to avoid it being inferred as 'unknown'. */}
                    {scenes?.map((scene: Scene) => (
                        <SceneCard 
                            key={scene.scene_number}
                            scene={scene}
                            imageUrl={sceneImageUrls[scene.scene_number]}
                            videoUrl={sceneVideoUrls[scene.scene_number]}
                            isVisualizing={visualizingScenes.has(scene.scene_number)}
                            isGeneratingVideo={generatingVideoScenes.has(scene.scene_number)}
                            onGenerateVideo={() => handleGenerateVideo(scene)}
                            onRegenerateVisual={() => handleRegenerateVisual(scene)}
                        />
                    ))}
                 </div>
                 <button onClick={() => dispatch({type: 'START_OVER'})} className="w-full mt-6 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">Mulai Lagi</button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScriptGenerator;