import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from './Loader';
import { VideoIcon } from './icons/VideoIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { CloseIcon } from './icons/CloseIcon';

const WarningTriangleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.5 13c1.155 2-0.289 4.5-2.598 4.5H4.499c-2.31 0-3.753-2.5-2.598-4.5l7.5-13zM12 17a1 1 0 110-2 1 1 0 010 2zm-1-6a1 1 0 011-1h.01a1 1 0 110 2H12a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

interface VideoGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageToAnimateUrl: string;
    initialPrompt: string;
    onGenerate: (prompt: string, aspectRatio: '16:9' | '9:16') => void;
    isLoading: boolean;
    loadingMessage: string;
    generatedVideoUrl: string | null;
    sourceImageAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | string;
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({
    isOpen,
    onClose,
    imageToAnimateUrl,
    initialPrompt,
    onGenerate,
    isLoading,
    loadingMessage,
    generatedVideoUrl,
    sourceImageAspectRatio
}) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
        }
    }, [isOpen, initialPrompt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onGenerate(prompt.trim(), aspectRatio);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <Loader message={loadingMessage} />
                </div>
            );
        }

        if (generatedVideoUrl) {
            return (
                <div className="flex flex-col items-center h-full">
                    <video
                        key={generatedVideoUrl}
                        src={generatedVideoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full h-auto max-h-[60vh] rounded-lg"
                    />
                    <a
                        href={generatedVideoUrl}
                        download={`ai-generated-video-${Date.now()}.mp4`}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors hover:bg-green-500"
                    >
                        <DownloadIcon /> Unduh Video
                    </a>
                </div>
            );
        }
        
        const showWarning = sourceImageAspectRatio !== aspectRatio;

        return (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
                <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={imageToAnimateUrl} alt="Pratinjau gambar untuk dianimasikan" className="w-full h-full object-contain" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rasio Aspek Video</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setAspectRatio('16:9')} className={`flex-1 py-2 text-sm rounded-md ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>16:9 Landscape</button>
                        <button type="button" onClick={() => setAspectRatio('9:16')} className={`flex-1 py-2 text-sm rounded-md ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>9:16 Portrait</button>
                    </div>
                </div>
                {showWarning && (
                     <div className="flex items-start gap-2 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-xs">
                        <WarningTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>Peringatan: Gambar sumber Anda memiliki rasio {sourceImageAspectRatio}. Video akan dibuat dengan rasio {aspectRatio}, yang dapat menyebabkan pemotongan (cropping).</span>
                    </div>
                )}
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full flex-grow p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 resize-none"
                    rows={4}
                />
                <button type="submit" disabled={isLoading || !prompt.trim()} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
                    <VideoIcon /> Buat Video
                </button>
            </form>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-lg flex flex-col max-h-[95vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex-shrink-0 mb-4">
                            <h2 className="text-xl font-bold text-white">Generator Video Iklan AI</h2>
                            <p className="text-sm text-gray-400">Hidupkan foto Anda menjadi klip video pendek yang menarik.</p>
                        </div>
                        <div className="flex-grow min-h-0">
                           {renderContent()}
                        </div>
                        <div className="mt-4 flex-shrink-0">
                            <button onClick={onClose} className="w-full bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition">
                                Tutup
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VideoGenerationModal;