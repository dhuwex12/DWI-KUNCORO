import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface CustomOutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (description: string) => void;
  initialValue: string;
}

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
};

const CustomOutfitModal: React.FC<CustomOutfitModalProps> = ({ isOpen, onClose, onSave, initialValue }) => {
  const [description, setDescription] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
        setDescription(initialValue);
        setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialValue]);
  
  if (!isOpen) return null;

  const handleSave = () => {
    onSave(description);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">Gaya Pakaian Kustom</h2>
        <p className="text-sm text-gray-400 mb-4">
          Jelaskan secara detail gaya pakaian yang Anda inginkan untuk model.
        </p>
        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Gaun malam berwarna merah marun yang elegan dengan belahan tinggi, terbuat dari sutra."
          className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          rows={4}
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!description.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition disabled:opacity-50"
          >
            Simpan Gaya
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomOutfitModal;