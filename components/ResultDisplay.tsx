


import React, { useState } from 'react';
import { ResultData, UploadedImage } from '../types';
import ImagePreviewModal from './ImagePreviewModal';
import { DownloadIcon } from './icons/DownloadIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultDisplayProps {
  results: ResultData[];
  originalImage: UploadedImage | null;
  onStartOver: () => void;
  onRegenerate: (index: number) => void;
  regeneratingIndices: Set<number>;
  onDownloadAll: () => void;
  onUseAsInput: (imageUrl: string) => void;
  productDescription?: string;
  onNavigateToApp?: (appId: string) => void;
  onUpdateVideoPrompt?: (index: number, prompt: string) => void;
  onUpdatePromoScript?: (index: number, script: string) => void;
  onOpenVideoModal?: (result: ResultData) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  results, originalImage, onStartOver, onRegenerate, regeneratingIndices, onDownloadAll, onUseAsInput,
  productDescription, onNavigateToApp, onUpdateVideoPrompt, onUpdatePromoScript, onOpenVideoModal
}) => {
  const [previewState, setPreviewState] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });

  if (!originalImage) return null;

  const openPreview = (index: number) => {
    setPreviewState({ isOpen: true, index });
  };

  const closePreview = () => {
    setPreviewState({ isOpen: false, index: 0 });
  };

  const navigatePreview = (newIndex: number) => {
    setPreviewState(prev => ({ ...prev, index: newIndex }));
  };

  return (
    <>
      <div className="w-full flex flex-col items-center">
        <div className="w-full flex flex-col items-start gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hasil Foto Profesional Anda</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {results.length > 1 && (
                <button
                    onClick={onDownloadAll}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-green-500"
                    title="Unduh semua gambar"
                >
                    <DownloadIcon /> Unduh Semua
                </button>
            )}
            <button
                onClick={onStartOver}
                className="bg-gray-500 dark:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-gray-600 dark:hover:bg-gray-500 w-full sm:w-auto flex justify-center"
            >
                Mulai Lagi
            </button>
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {results.map((result, index) => {
            const isRegenerating = regeneratingIndices.has(index);
            return (
                <motion.div key={index} variants={itemVariants} className="w-full">
                    <button
                        onClick={() => openPreview(index)}
                        className="relative group w-full aspect-square bg-gray-200 dark:bg-gray-900 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                        aria-label={`Lihat pratinjau gambar ${index + 1}`}
                    >
                        <img
                            src={result.imageUrl}
                            alt={`Hasil foto ${index + 1} dengan gaya ${result.style || 'Kustom'}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isRegenerating && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-2 border-dashed border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </button>
                </motion.div>
            );
          })}
        </motion.div>

        <style>{`
           @keyframes spin { to { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>

      <AnimatePresence>
        {previewState.isOpen && (
            <ImagePreviewModal
                results={results}
                currentIndex={previewState.index}
                onClose={closePreview}
                onNavigate={navigatePreview}
                onRegenerate={() => onRegenerate(previewState.index)}
                isRegenerating={regeneratingIndices.has(previewState.index)}
                onUseAsInput={() => {
                    if (onUseAsInput) {
                        onUseAsInput(results[previewState.index].imageUrl);
                        closePreview();
                    }
                }}
                productDescription={productDescription}
                onNavigateToApp={onNavigateToApp}
                onUpdateVideoPrompt={onUpdateVideoPrompt}
                onUpdatePromoScript={onUpdatePromoScript}
                onOpenVideoModal={onOpenVideoModal ? () => onOpenVideoModal(results[previewState.index]) : undefined}
            />
        )}
      </AnimatePresence>
    </>
  );
};

export default ResultDisplay;