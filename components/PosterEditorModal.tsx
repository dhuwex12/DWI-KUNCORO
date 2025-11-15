import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { generatePoster } from '../services/geminiService';
import { UploadedImage, PosterConfig } from '../types';
import Loader from './Loader';
import { CloseIcon } from './icons/CloseIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface PosterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialConfig: PosterConfig;
  sourceImage: UploadedImage | null;
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: 'easeIn' } }
};

const PosterEditorModal: React.FC<PosterEditorModalProps> = ({ isOpen, onClose, imageUrl, initialConfig, sourceImage }) => {
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refinementInstruction, setRefinementInstruction] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCurrentImageUrl(imageUrl);
            setError(null);
            setRefinementInstruction('');
        }
    }, [isOpen, imageUrl]);

    const handleRegenerateWithInstruction = async () => {
        if (!sourceImage) {
            setError("Gambar sumber tidak ditemukan, tidak dapat membuat ulang.");
            return;
        }
        if (!refinementInstruction.trim()) {
            setError("Harap berikan instruksi penyempurnaan.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await generatePoster(sourceImage, initialConfig, refinementInstruction);
            setCurrentImageUrl(result.imageUrl);
            setRefinementInstruction('');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Gagal membuat ulang poster.';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <motion.div
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-4xl flex flex-col md:flex-row gap-6 max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Preview */}
                <div className="flex-1 flex items-center justify-center bg-gray-900/50 rounded-lg relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentImageUrl}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            src={currentImageUrl}
                            alt="Pratinjau Poster"
                            className="w-auto h-auto max-w-full max-h-[80vh] object-contain"
                        />
                    </AnimatePresence>
                        {isLoading && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader message="Menyempurnakan poster..." />
                        </div>
                    )}
                </div>

                {/* Editor Controls */}
                <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Sempurnakan Poster</h3>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                            <CloseIcon />
                        </button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Instruksi Penyempurnaan</label>
                            <p className="text-xs text-gray-500 mb-2">Berikan perintah pada AI untuk memperbaiki desain ini.</p>
                            <textarea
                                value={refinementInstruction}
                                onChange={(e) => setRefinementInstruction(e.target.value)}
                                placeholder="Contoh: Buat judulnya lebih besar dan letakkan di tengah. Ganti warna CTA menjadi biru."
                                className="w-full h-32 p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                                rows={5}
                            />
                        </div>

                         <div className="text-xs text-gray-500 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <p className="font-bold text-gray-400 mb-1">Brief Asli (untuk konteks):</p>
                            <p className="truncate"><strong>Tema:</strong> {initialConfig.theme}</p>
                            <p className="truncate"><strong>Headline:</strong> {initialConfig.headline}</p>
                        </div>
                        
                        {error && <p className="text-sm text-red-400">{error}</p>}
                    </div>

                    <button
                        onClick={handleRegenerateWithInstruction}
                        disabled={isLoading || !sourceImage || !refinementInstruction.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50"
                    >
                        <SparklesIcon /> {isLoading ? 'Memperbarui...' : 'Perbarui Poster'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default PosterEditorModal;