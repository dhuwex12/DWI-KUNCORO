import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { modelManager, ModelSettings } from '../services/geminiService';
import { SettingsIcon } from './icons/SettingsIcon';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
};

const MODEL_OPTIONS = {
    image: [
        { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', desc: 'Cepat & efisien untuk sebagian besar tugas.' },
        { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0', desc: 'Kualitas tertinggi, sedikit lebih lambat.' },
    ],
    text: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Cepat, bagus untuk copywriting & ide cepat.' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Lebih canggih, ideal untuk naskah & logika kompleks.' },
    ],
    video_fast: [
        { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', desc: 'Generasi video cepat, kualitas baik (720p).' },
        { id: 'veo-2.0-generate-001', name: 'Veo 2.0', desc: 'Model lama, mungkin lebih lambat.' },
    ],
    video_hq: [
        { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 HQ', desc: 'Kualitas video tertinggi, proses lebih lama.' },
    ],
    tts: [
        { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS', desc: 'Suara text-to-speech standar.' },
    ]
};

const SelectRow: React.FC<{
    label: string;
    description: string;
    value: string;
    options: { id: string, name: string, desc: string }[];
    onChange: (value: string) => void;
}> = ({ label, description, value, options, onChange }) => (
    <div>
        <h4 className="font-semibold text-white">{label}</h4>
        <p className="text-xs text-gray-400 mb-2">{description}</p>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
            {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name} - {opt.desc}</option>
            ))}
        </select>
    </div>
);

const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ModelSettings>(modelManager.getSettings());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      setSettings(modelManager.getSettings());
    }
  }, [isOpen]);
  
  const handleSave = () => {
    modelManager.updateSettings(settings);
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
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-full border border-indigo-500/50">
                    <SettingsIcon />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Pengaturan Model AI</h2>
                    <p className="text-sm text-gray-400">
                      Pilih model yang akan digunakan untuk berbagai tugas di dalam studio.
                    </p>
                </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
               <SelectRow 
                    label="Generasi Gambar"
                    description="Untuk Stylo, Spesialis Fotografi, Desain Poster, dll."
                    value={settings.image}
                    options={MODEL_OPTIONS.image}
                    onChange={(val) => setSettings(s => ({...s, image: val}))}
               />
               <SelectRow 
                    label="Teks & Logika Lanjutan"
                    description="Untuk AI Agent, Generator Naskah, Copywriter, dll."
                    value={settings.text}
                    options={MODEL_OPTIONS.text}
                    onChange={(val) => setSettings(s => ({...s, text: val}))}
               />
               <SelectRow 
                    label="Generasi Video (Cepat)"
                    description="Digunakan untuk mode 'Cepat' di Video Generator & alur kerja."
                    value={settings.video_fast}
                    options={MODEL_OPTIONS.video_fast}
                    onChange={(val) => setSettings(s => ({...s, video_fast: val}))}
               />
               <SelectRow 
                    label="Generasi Video (Kualitas Tertinggi)"
                    description="Digunakan untuk mode 'Kualitas Tertinggi' di Video Generator."
                    value={settings.video_hq}
                    options={MODEL_OPTIONS.video_hq}
                    onChange={(val) => setSettings(s => ({...s, video_hq: val}))}
               />
                <SelectRow 
                    label="Text-to-Speech (TTS)"
                    description="Untuk Studio Voiceover AI."
                    value={settings.tts}
                    options={MODEL_OPTIONS.tts}
                    onChange={(val) => setSettings(s => ({...s, tts: val}))}
               />
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition"
              >
                Tutup
              </button>
              <button
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg font-bold transition w-40 ${
                    saveStatus === 'saved'
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {saveStatus === 'saved' ? 'Tersimpan!' : 'Simpan Pengaturan'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModelSettingsModal;