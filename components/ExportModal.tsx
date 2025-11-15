import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { FlowProductionPackage } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    productionPackage: FlowProductionPackage;
    images: Record<number, string | 'loading' | 'error' | null>;
    audios?: Record<number, string | 'loading' | 'error' | null>;
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
};

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-indigo-600 rounded-md transition-colors">
            {copied ? 'Tersalin!' : 'Salin JSON'}
        </button>
    );
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, productionPackage, images, audios }) => {

    const handleDownloadAll = () => {
        const downloadFile = (url: string, filename: string) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        let delay = 0;
        const stagger = 300; // 300ms between each download start

        // Download images
        Object.entries(images).forEach(([sceneNum, imageUrl]) => {
            if (typeof imageUrl === 'string') {
                setTimeout(() => downloadFile(imageUrl, `scene_${sceneNum}_image.png`), delay);
                delay += stagger;
            }
        });

        // Download audios
        if (audios) {
            Object.entries(audios).forEach(([sceneNum, audioUrl]) => {
                if (typeof audioUrl === 'string') {
                    setTimeout(() => downloadFile(audioUrl, `scene_${sceneNum}_audio.wav`), delay);
                    delay += stagger;
                }
            });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
                    <motion.div
                        variants={modalContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">Ekspor Paket Produksi</h2>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="space-y-4 overflow-y-auto pr-2 -mr-2">
                            <div>
                                <h3 className="font-semibold text-white mb-2">Prompt JSON untuk Generator Video</h3>
                                <div className="relative">
                                    <pre className="bg-gray-900 p-3 rounded-md text-xs text-gray-300 font-mono overflow-x-auto max-h-48">
                                        {JSON.stringify(productionPackage, null, 2)}
                                    </pre>
                                    <CopyButton textToCopy={JSON.stringify(productionPackage, null, 2)} />
                                </div>
                            </div>
                             <div>
                                <h3 className="font-semibold text-white mb-2">Aset Gambar</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.entries(images).map(([sceneNum, imageUrl]) => (
                                        typeof imageUrl === 'string' ? (
                                            <a key={sceneNum} href={imageUrl} download={`scene_${sceneNum}_image.png`} className="aspect-square bg-gray-900 rounded-md overflow-hidden group">
                                                <img src={imageUrl} alt={`Scene ${sceneNum}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">Unduh</div>
                                            </a>
                                        ) : null
                                    ))}
                                </div>
                            </div>
                            {audios && Object.values(audios).some(a => typeof a === 'string') && (
                                <div>
                                    <h3 className="font-semibold text-white mb-2">Aset Audio</h3>
                                    <div className="space-y-2">
                                        {Object.entries(audios).map(([sceneNum, audioUrl]) => (
                                             typeof audioUrl === 'string' ? (
                                                <div key={sceneNum} className="flex items-center justify-between bg-gray-900 p-2 rounded-md">
                                                    <span className="text-sm text-gray-300">Adegan {sceneNum} Audio</span>
                                                    <a href={audioUrl} download={`scene_${sceneNum}_audio.wav`} className="p-1.5 bg-gray-700 rounded-md hover:bg-indigo-600">
                                                        <DownloadIcon />
                                                    </a>
                                                </div>
                                            ) : null
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex-shrink-0 flex gap-4">
                             <button onClick={handleDownloadAll} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 transition">
                                <DownloadIcon /> Unduh Semua Aset
                            </button>
                            <button onClick={onClose} className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition">
                                Tutup
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ExportModal;