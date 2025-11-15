import React, { useReducer, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedImage } from '../types';
import { removeBackground, addShadow, replaceBackground } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import ImageEditor from './ImageEditor';
import { EditorState } from './ImageEditor';
import Toolbar from './Toolbar';
import { DownloadIcon } from './icons/DownloadIcon';
import { ShadowIcon } from './icons/ShadowIcon';
import { SparklesIcon } from './icons/SparklesIcon';

// --- State, Reducer, and Actions ---

type AppStep = 'UPLOAD' | 'MASK' | 'REFINE';

interface BGRemoverState {
  step: AppStep;
  uploadedImage: UploadedImage | null;
  maskImage: string | null;
  aiResultImage: string | null;
  finalImage: string | null; 
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

const initialState: BGRemoverState = {
  step: 'UPLOAD',
  uploadedImage: null,
  maskImage: null,
  aiResultImage: null,
  finalImage: null,
  isLoading: false,
  loadingMessage: 'AI sedang bekerja...',
  error: null,
};

type BGRemoverAction =
  | { type: 'UPLOAD_IMAGE'; payload: UploadedImage }
  | { type: 'START_MASKING' }
  | { type: 'PROCESS_START'; payload: { message: string } }
  | { type: 'PROCESS_SUCCESS'; payload: { imageUrl: string } }
  | { type: 'PROCESS_ERROR'; payload: string }
  | { type: 'START_REFINE'; payload: { maskImage: string, aiResultImage: string } }
  | { type: 'UPDATE_FINAL_IMAGE'; payload: string }
  | { type: 'START_OVER' };

function bgRemoverReducer(state: BGRemoverState, action: BGRemoverAction): BGRemoverState {
  switch (action.type) {
    case 'UPLOAD_IMAGE':
      return { ...initialState, uploadedImage: action.payload, step: 'MASK' };
    case 'START_MASKING':
        return { ...state, step: 'MASK' };
    case 'PROCESS_START':
      return { ...state, isLoading: true, loadingMessage: action.payload.message, error: null };
    case 'PROCESS_SUCCESS':
      return { ...state, isLoading: false, aiResultImage: action.payload.imageUrl, finalImage: action.payload.imageUrl, step: 'REFINE' };
    case 'PROCESS_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'START_REFINE':
       return { ...state, step: 'REFINE', maskImage: action.payload.maskImage, isLoading: true, loadingMessage: 'Menghapus latar belakang...' };
    case 'UPDATE_FINAL_IMAGE':
       return { ...state, finalImage: action.payload, isLoading: false };
    case 'START_OVER':
      return { ...initialState };
    default:
      return state;
  }
}

// --- Background Remover Component ---

const BackgroundRemover: React.FC = () => {
  const [state, dispatch] = useReducer(bgRemoverReducer, initialState);
  const { step, uploadedImage, aiResultImage, finalImage, isLoading, loadingMessage, error } = state;
  
  const [editorState, setEditorState] = useState<EditorState>({ tool: 'brush', brushSize: 30 });
  const [bgPrompt, setBgPrompt] = useState('');
  const imageEditorRef = useRef<{getImageData: () => Promise<string | null>}>(null);


  const handleImageUpload = useCallback((image: UploadedImage | null) => {
    if (image) {
        dispatch({ type: 'UPLOAD_IMAGE', payload: image });
    }
  }, []);

  const handleRemoveBackground = async (mask: string | null) => {
    if (!uploadedImage) return;
    dispatch({ type: 'PROCESS_START', payload: { message: 'AI sedang menganalisis...' } });
    try {
      const result = await removeBackground(uploadedImage.base64, uploadedImage.mimeType, mask);
      dispatch({ type: 'PROCESS_SUCCESS', payload: result });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      dispatch({ type: 'PROCESS_ERROR', payload: `Gagal menghapus latar belakang. ${errorMessage}` });
    }
  };

  const handleAddShadow = async () => {
    if (!finalImage) return;
    dispatch({ type: 'PROCESS_START', payload: { message: 'Menambahkan bayangan...' } });
    try {
        const currentImageData = await imageEditorRef.current?.getImageData();
        if (!currentImageData) throw new Error("Could not get image data from editor.");
        const result = await addShadow(currentImageData.split(',')[1], 'image/png');
        dispatch({ type: 'UPDATE_FINAL_IMAGE', payload: result.imageUrl });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        dispatch({ type: 'PROCESS_ERROR', payload: `Gagal menambahkan bayangan. ${errorMessage}` });
    }
  };
  
  const handleReplaceBg = async () => {
    if (!finalImage || !bgPrompt.trim()) return;
    dispatch({ type: 'PROCESS_START', payload: { message: 'Mengganti latar belakang...' } });
    try {
        const currentImageData = await imageEditorRef.current?.getImageData();
        if (!currentImageData) throw new Error("Could not get image data from editor.");
        const result = await replaceBackground(currentImageData.split(',')[1], 'image/png', bgPrompt);
        dispatch({ type: 'UPDATE_FINAL_IMAGE', payload: result.imageUrl });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        dispatch({ type: 'PROCESS_ERROR', payload: `Gagal mengganti latar belakang. ${errorMessage}` });
    }
  };


  const handleStartOver = () => { dispatch({ type: 'START_OVER' }); };
  
  const handleDownload = async () => {
    if (!imageEditorRef.current) return;
    const imageDataUrl = await imageEditorRef.current.getImageData();
    if (!imageDataUrl || !uploadedImage) return;
    const link = document.createElement('a');
    link.href = imageDataUrl;
    const originalName = uploadedImage.name.substring(0, uploadedImage.name.lastIndexOf('.')) || 'image';
    link.download = `${originalName}-edited.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const renderStepContent = () => {
      const imageUrl = `data:${uploadedImage?.mimeType};base64,${uploadedImage?.base64}`;
      switch(step) {
          case 'UPLOAD':
              return (
                <div className="w-full flex flex-col gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">1. Unggah Foto</h2>
                        <p className="text-sm text-gray-400">Pilih gambar yang ingin Anda hapus latar belakangnya.</p>
                    </div>
                    <ImageUploader onImageUpload={handleImageUpload} image={uploadedImage} />
                </div>
              );
          case 'MASK':
              return (
                  <div className="w-full flex flex-col gap-4">
                      <div>
                          <h2 className="text-xl font-bold text-white mb-1">2. Beri Petunjuk AI (Opsional)</h2>
                          <p className="text-sm text-gray-400">Gores area hijau untuk dipertahankan, merah untuk dibuang. Atau langsung lanjutkan.</p>
                      </div>
                      <Toolbar editorState={editorState} setEditorState={setEditorState} availableTools={['brush', 'eraser']} showBrushSize />
                      <ImageEditor 
                        ref={imageEditorRef}
                        imageUrl={imageUrl} 
                        editorState={editorState}
                        mode="mask"
                      />
                      <div className="flex gap-4">
                        <button onClick={async () => {
                            const mask = await imageEditorRef.current?.getImageData();
                            handleRemoveBackground(mask ? mask.split(',')[1] : null);
                        }} className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 transition">
                            Hapus Latar Belakang
                        </button>
                      </div>
                  </div>
              );
          case 'REFINE':
              return (
                <div className="w-full flex flex-col gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">3. Sempurnakan & Kreasikan</h2>
                        <p className="text-sm text-gray-400">Gunakan kuas untuk menyempurnakan, lalu tambahkan bayangan atau ganti latar belakang.</p>
                    </div>
                    <Toolbar editorState={editorState} setEditorState={setEditorState} availableTools={['refine', 'erase']} showBrushSize showUndoRedo showZoom />
                    <ImageEditor
                        ref={imageEditorRef}
                        imageUrl={finalImage || ''}
                        originalImageUrlForRestore={imageUrl}
                        editorState={editorState}
                        mode="refine"
                    />
                </div>
              );
      }
  }

  const renderResultActions = () => (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full flex flex-col gap-6 mt-6 pt-6 border-t border-gray-700"
      >
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Studio Lanjutan</h3>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                <button onClick={handleAddShadow} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-all hover:bg-gray-600 disabled:opacity-50">
                    <ShadowIcon /> {isLoading && loadingMessage.includes('bayangan') ? 'Memproses...' : 'Tambah Bayangan Realistis'}
                </button>
            </div>
             <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                <textarea
                    value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value)}
                    placeholder="Contoh: Di atas meja kayu dengan jendela di latar belakang..."
                    className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200"
                />
                <button onClick={handleReplaceBg} disabled={isLoading || !bgPrompt.trim()} className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-all hover:bg-gray-600 disabled:opacity-50">
                    <SparklesIcon /> {isLoading && loadingMessage.includes('latar') ? 'Memproses...' : 'Ganti Latar Belakang AI'}
                </button>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-500 transition">
                <DownloadIcon /> Unduh PNG
            </button>
            <button onClick={handleStartOver} className="flex-1 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-500 transition">
                Mulai Lagi
            </button>
        </div>
      </motion.div>
  )

  return (
    <div className="w-full font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col"
        >
            {renderStepContent()}
            {step === 'REFINE' && !isLoading && renderResultActions()}
        </motion.div>

        {/* Right Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[30rem] flex flex-col justify-center items-center sticky top-8"
        >
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader message={loadingMessage} />
              </motion.div>
            )}
            {error && !isLoading && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-red-400">
                <h3 className="font-bold text-lg">Oops! Terjadi Kesalahan</h3>
                <p className="text-sm mt-2">{error}</p>
                <button onClick={() => {
                    // Simple retry logic
                    if (step === 'REFINE') { handleRemoveBackground(state.maskImage); } 
                    else { dispatch({ type: 'PROCESS_ERROR', payload: '' }); } // clear error
                }} className="mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500">
                  Coba Lagi
                </button>
              </motion.div>
            )}
            {!isLoading && !error && (
                <motion.div 
                    key="canvas-display"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full h-full"
                >
                {step === 'UPLOAD' && (
                    <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                        <h3 className="font-bold text-lg text-gray-400 mt-4">Pratinjau Hasil</h3>
                        <p className="text-sm mt-1 max-w-sm">Unggah gambar untuk memulai proses pengeditan.</p>
                    </div>
                )}
                {step === 'MASK' && uploadedImage && (
                    <div className="w-full aspect-square relative checkerboard-bg rounded-lg">
                        <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`} alt="Preview" className="absolute inset-0 w-full h-full object-contain"/>
                    </div>
                )}
                {step === 'REFINE' && finalImage && (
                    <div className="w-full aspect-square relative checkerboard-bg rounded-lg">
                        <img src={finalImage} alt="Hasil akhir" className="absolute inset-0 w-full h-full object-contain"/>
                    </div>
                )}
                </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <style>{`
        .checkerboard-bg {
          background-image:
            linear-gradient(45deg, #444 25%, transparent 25%),
            linear-gradient(-45deg, #444 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #444 75%),
            linear-gradient(-45deg, transparent 75%, #444 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          background-color: #333;
        }
      `}</style>
    </div>
  );
};

export default BackgroundRemover;