import React, { useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';

const WarningTriangleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.5 13c1.155 2-0.289 4.5-2.598 4.5H4.499c-2.31 0-3.753-2.5-2.598-4.5l7.5-13zM12 17a1 1 0 110-2 1 1 0 010 2zm-1-6a1 1 0 011-1h.01a1 1 0 110 2H12a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

interface FreeTierVideoWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContinue: () => void;
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
};

const FreeTierVideoWarningModal: React.FC<FreeTierVideoWarningModalProps> = ({ isOpen, onClose, onContinue }) => {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <motion.div
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <WarningTriangleIcon className="w-6 h-6 text-yellow-300" />
                        Peringatan untuk Pengguna Free Tier
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="overflow-y-auto pr-2 -mr-2 text-gray-300 text-sm space-y-4">
                    <p>
                        Fitur 'Buat Video' di alur kerja ini memiliki <strong className="text-white">kuota harian yang terbatas</strong> (sekitar 5-10 klip/hari) untuk pengguna gratis dan prosesnya bisa memakan waktu <strong className="text-white">beberapa menit per klip</strong>.
                    </p>
                    
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                         <h3 className="font-semibold text-indigo-300 mb-2">Untuk Pengalaman Terbaik, Kami Sarankan:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                             <li>Gunakan visual gambar diam (still image) yang telah dibuat di langkah ini.</li>
                            <li>Bawa gambar tersebut ke platform lain seperti <strong className="text-white">Google AI Studio</strong>, <strong className="text-white">Gemini</strong>, atau <strong className="text-white">Flow</strong> untuk diubah menjadi video.</li>
                            <li>
                                Manfaatkan <a href="https://cloud.google.com/free" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline hover:text-indigo-200">kredit gratis senilai $300 dari Google Cloud</a> dengan API Key Anda sendiri untuk penggunaan tanpa batas.
                            </li>
                        </ol>
                    </div>
                </div>

                <div className="mt-6 flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition">
                        Saya Mengerti
                    </button>
                    <button onClick={onContinue} className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition">
                        Tetap Lanjutkan (Kuota Terbatas)
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default FreeTierVideoWarningModal;
