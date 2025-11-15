import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (description: string) => void;
  initialDescription: string;
}

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
};

const DescriptionModal: React.FC<DescriptionModalProps> = ({ isOpen, onClose, onSave, initialDescription }) => {
  const [description, setDescription] = useState(initialDescription);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
        setDescription(initialDescription);
        setTimeout(() => textareaRef.current?.focus(), 100); // Focus after animation
    }
  }, [isOpen, initialDescription]);
  
  if (!isOpen) return null;

  const handleSave = () => {
    onSave(description);
  };
  
  const handleSkip = () => {
    onSave(description || ''); // Save current text or empty string if skipped
    onClose();
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
        <h2 className="text-xl font-bold text-white mb-4">Deskripsi Produk Anda</h2>
        <p className="text-sm text-gray-400 mb-4">
          Bantu AI memahami produk Anda untuk memberikan rekomendasi gaya foto yang lebih baik. (Opsional)
        </p>
        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Sepatu lari premium dengan bahan breathable, dirancang untuk kenyamanan maksimal..."
          className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          rows={4}
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleSkip}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition"
          >
            Lewati
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition"
          >
            Simpan Deskripsi
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DescriptionModal;
