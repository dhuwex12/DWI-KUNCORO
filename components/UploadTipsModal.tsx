import React, { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { InfoIcon } from './icons/InfoIcon';

interface UploadTipsModalProps {
  onClose: () => void;
}

const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
};

const UploadTipsModal: React.FC<UploadTipsModalProps> = ({ onClose }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
        <motion.div 
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-lg flex flex-col gap-4" 
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-full border border-indigo-500/50">
                    <InfoIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Tips Unggah & Potong Gambar</h2>
                    <p className="text-sm text-gray-400">Maksimalkan hasil poster Anda dengan langkah ini.</p>
                </div>
            </div>
            <div className="text-gray-300 text-sm space-y-3">
                <p>
                    Fitur potong (crop) bukan hanya untuk memotong bagian yang tidak diinginkan, tetapi juga merupakan langkah krusial untuk **menentukan aspek rasio akhir poster Anda**.
                </p>
                <p>
                    Aspek rasio yang Anda pilih saat memotong gambar akan secara langsung memengaruhi komposisi dan dimensi poster yang dihasilkan oleh AI.
                </p>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <p className="font-semibold text-white">Contoh Penggunaan:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                        <li>Pilih aspek rasio <strong className="text-gray-200">9:16</strong> untuk membuat poster yang sempurna untuk Instagram atau TikTok Story.</li>
                        <li>Pilih aspek rasio <strong className="text-gray-200">1:1</strong> untuk postingan feed Instagram.</li>
                        <li>Pilih aspek rasio <strong className="text-gray-200">4:3</strong> atau <strong className="text-gray-200">16:9</strong> untuk iklan Facebook atau thumbnail YouTube.</li>
                    </ul>
                </div>
                <p>
                    Dengan mengatur aspek rasio sejak awal, Anda memberikan arahan yang jelas kepada AI untuk menciptakan desain yang sesuai dengan platform tujuan Anda.
                </p>
            </div>
            <div className="mt-2 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition"
                >
                    Saya Mengerti
                </button>
            </div>
        </motion.div>
    </div>
  );
};

export default UploadTipsModal;