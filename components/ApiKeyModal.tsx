import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { apiKeyManager } from '../services/geminiService';
import { KeyIcon } from './icons/KeyIcon';

const MAX_KEYS = 10;

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<string[]>(['']);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      const storedKeysRaw = localStorage.getItem('backup_api_keys');
      try {
        if (storedKeysRaw) {
          const storedKeys = JSON.parse(storedKeysRaw);
          if (Array.isArray(storedKeys) && storedKeys.length > 0) {
            setKeys(storedKeys);
          } else {
            setKeys(['']);
          }
        } else {
          setKeys(['']);
        }
      } catch (e) {
        console.error("Failed to parse backup keys from localStorage", e);
        setKeys(['']);
      }
    }
  }, [isOpen]);

  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...keys];
    newKeys[index] = value;
    setKeys(newKeys);
  };

  const handleAddKey = () => {
    if (keys.length < MAX_KEYS) {
      setKeys([...keys, '']);
    }
  };

  const handleRemoveKey = (index: number) => {
    if (keys.length > 1) {
      setKeys(keys.filter((_, i) => i !== index));
    } else {
      // If it's the last key, just clear it instead of removing the input
      setKeys(['']);
    }
  };

  const handleSave = () => {
    const validKeys = keys.filter(k => k.trim() !== '');
    apiKeyManager.updateBackupKeys(validKeys);
    setSaveStatus('saved');
    setTimeout(() => {
        setSaveStatus('idle');
        onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-lg flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-full border border-indigo-500/50">
                    <KeyIcon />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Manajemen API Key Cadangan</h2>
                    <p className="text-sm text-gray-400">
                      Kunci ini akan digunakan jika kunci utama mencapai batasnya.
                    </p>
                </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {keys.map((key, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => handleKeyChange(index, e.target.value)}
                    placeholder={`Kunci API Cadangan #${index + 1}`}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    onClick={() => handleRemoveKey(index)}
                    className="p-2 bg-gray-700 hover:bg-red-600 rounded-md text-white transition-colors flex-shrink-0"
                    aria-label={`Hapus kunci #${index + 1}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {keys.length < MAX_KEYS && (
              <button
                onClick={handleAddKey}
                className="w-full text-sm font-semibold py-2 px-3 border-2 border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 rounded-lg transition"
              >
                + Tambah Kunci Baru
              </button>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition"
              >
                Tutup
              </button>
              <button
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg font-bold transition w-32 ${
                    saveStatus === 'saved'
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {saveStatus === 'saved' ? 'Tersimpan!' : 'Simpan Kunci'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ApiKeyModal;
