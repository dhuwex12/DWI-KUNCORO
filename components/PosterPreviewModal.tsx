
import React, { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { EditIcon } from './icons/EditIcon'; // Import EditIcon
import Loader from './Loader';

interface PosterPreviewModalProps {
  imageUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onEdit: () => void; // Add onEdit prop
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: "easeIn" } }
};

const PosterPreviewModal: React.FC<PosterPreviewModalProps> = ({ imageUrls, currentIndex, onClose, onNavigate, onRegenerate, isRegenerating, onEdit }) => {
  const currentImageUrl = imageUrls[currentIndex];

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % imageUrls.length;
    onNavigate(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    onNavigate(prevIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, imageUrls.length]);
  
  const handleDownload = () => {
    if (!currentImageUrl) return;
    const link = document.createElement('a');
    link.href = currentImageUrl;
    link.download = `ai-poster-design-${currentIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentImageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
        <motion.div 
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full h-full flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative">
                <motion.img
                    key={currentImageUrl}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    src={currentImageUrl} 
                    alt={`Pratinjau poster ${currentIndex + 1}`}
                    className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl" 
                />
                {isRegenerating && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                        <Loader message="Membuat ulang..." />
                    </div>
                )}
            </div>

            <div className="absolute top-4 right-4 flex gap-3">
                <button 
                    onClick={onEdit}
                    className="text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition"
                    title="Edit Poster"
                    aria-label="Edit poster ini"
                >
                    <EditIcon />
                </button>
                <button 
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="relative text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition disabled:opacity-50 disabled:cursor-wait"
                    title="Buat Ulang"
                    aria-label="Buat ulang poster ini"
                >
                    <RegenerateIcon />
                </button>
                <button 
                    onClick={handleDownload} 
                    className="text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition"
                    title="Unduh Latar"
                    aria-label="Unduh gambar latar ini"
                >
                    <DownloadIcon />
                </button>
                <button 
                    onClick={onClose} 
                    className="text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition"
                    title="Tutup Pratinjau"
                    aria-label="Tutup pratinjau"
                >
                    <CloseIcon />
                </button>
            </div>

            {imageUrls.length > 1 && (
                <>
                    <button 
                        onClick={handlePrev} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition disabled:opacity-50"
                        disabled={isRegenerating}
                        title="Poster Sebelumnya"
                        aria-label="Lihat poster sebelumnya"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button 
                        onClick={handleNext} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition disabled:opacity-50"
                        disabled={isRegenerating}
                        title="Poster Berikutnya"
                        aria-label="Lihat poster berikutnya"
                    >
                        <ChevronRightIcon />
                    </button>
                </>
            )}
        </motion.div>
    </div>
  );
};

export default PosterPreviewModal;
