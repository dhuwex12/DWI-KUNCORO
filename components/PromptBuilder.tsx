import React from 'react';
import { motion } from 'framer-motion';
// FIX: App.tsx does not export PromptBuilderField. It is defined locally in this file now.
// Also, the state is extended with an intersection type to solve property-not-found errors.
import { AppState } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';

// FIX: Defined PromptBuilderField here as it's not exported from App.tsx.
export type PromptBuilderField = 'background' | 'lighting' | 'composition' | 'mood' | 'details';


const NumberSelector: React.FC<{ value: number; onChange: (value: number) => void; max?: number; }> = ({ value, onChange, max = 10 }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Jumlah Gambar</label>
        <div className="flex flex-wrap gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map(num => (
                <button
                    key={num}
                    onClick={() => onChange(num)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-sm transition-colors border-2 ${
                        value === num
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                    }`}
                    aria-pressed={value === num}
                    aria-label={`Hasilkan ${num} gambar`}
                >
                    {num}
                </button>
            ))}
        </div>
    </div>
);

interface PromptBuilderProps {
    // FIX: Using an intersection type to add properties required by this component
    // without modifying the global AppState.
    state: AppState & {
        promptBuilderState: Record<PromptBuilderField, string>;
        isRecommendingField: PromptBuilderField | null;
    };
    onFieldChange: (field: PromptBuilderField, value: string) => void;
    onGetRecommendation: (field: PromptBuilderField) => void;
    onSetNumberOfImages: (num: number) => void;
    onSetNegativePrompt: (val: string) => void;
}

const BuilderField: React.FC<{
    field: PromptBuilderField;
    label: string;
    placeholder: string;
    value: string;
    isRecommending: boolean;
    onChange: (value: string) => void;
    onGetRecommendation: () => void;
}> = ({ field, label, placeholder, value, isRecommending, onChange, onGetRecommendation }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-300">{label}</label>
            <button
                onClick={onGetRecommendation}
                disabled={isRecommending}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
                {isRecommending ? (
                    <div className="w-3 h-3 border-2 border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin"></div>
                ) : (
                    <SparklesIcon />
                )}
                <span>Dapatkan Ide</span>
            </button>
        </div>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-24 p-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            rows={3}
        />
    </div>
);

const fields: { id: PromptBuilderField; label: string; placeholder: string }[] = [
    { id: 'background', label: 'Latar Belakang / Setting', placeholder: 'Contoh: di atas meja marmer putih, di pantai saat senja...' },
    { id: 'lighting', label: 'Pencahayaan', placeholder: 'Contoh: cahaya matahari pagi dari jendela, lampu studio dramatis...' },
    { id: 'composition', label: 'Komposisi & Sudut Pandang', placeholder: 'Contoh: foto makro close-up, gaya flat lay dari atas...' },
    { id: 'mood', label: 'Suasana (Mood) & Gaya', placeholder: 'Contoh: hangat dan nyaman, mewah dan misterius...' },
    { id: 'details', label: 'Detail Tambahan', placeholder: 'Contoh: dengan percikan air, ada bayangan daun tropis...' },
];

const PromptBuilder: React.FC<PromptBuilderProps> = ({
    state,
    onFieldChange,
    onGetRecommendation,
    onSetNumberOfImages,
    onSetNegativePrompt,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mt-4 flex flex-col gap-4"
        >
            <NumberSelector
                value={state.numberOfImages}
                onChange={onSetNumberOfImages}
            />
            
            <div className="space-y-4">
                {fields.map(f => (
                    <BuilderField
                        key={f.id}
                        field={f.id}
                        label={f.label}
                        placeholder={f.placeholder}
                        value={state.promptBuilderState[f.id]}
                        isRecommending={state.isRecommendingField === f.id}
                        onChange={(value) => onFieldChange(f.id, value)}
                        onGetRecommendation={() => onGetRecommendation(f.id)}
                    />
                ))}
            </div>
            
            <div>
                <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300">Prompt Negatif (Opsional)</label>
                <p className="text-xs text-gray-500 mb-2">Sebutkan hal-hal yang ingin Anda hindari pada gambar.</p>
                <textarea
                    id="negative-prompt"
                    value={state.negativePrompt}
                    onChange={(e) => onSetNegativePrompt(e.target.value)}
                    placeholder="Contoh: blur, teks, logo, tangan manusia, kualitas rendah..."
                    className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    rows={2}
                />
            </div>
        </motion.div>
    );
};

export default PromptBuilder;