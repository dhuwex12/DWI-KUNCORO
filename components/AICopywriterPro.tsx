
import React, { useReducer, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedImage, CopyResult } from '../types';
import { generateCopywriting, refineCopywriting, generateGroundedDescriptionFromImage } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';

// --- Icons for Mockups & Refine ---
const HeartIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const CommentIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m21 15-3-3H9a2 2 0 0 1 0-4h3a2 2 0 0 0 0-4H9a2 2 0 0 0-2 2v10l-3 3"></path></svg>;
const SendIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;

// --- State & Reducer ---
interface CopywriterState {
  productImage: UploadedImage | null;
  productDescription: string;
  isAutoDescribing: boolean;
  contentType: string;
  tone: string;
  targetAudience: string;
  isLoading: boolean;
  error: string | null;
  result: CopyResult | null;
  refiningState: { index: number; isLoading: boolean } | null;
}

const initialState: CopywriterState = {
  productImage: null,
  productDescription: '',
  isAutoDescribing: false,
  contentType: 'Caption Instagram',
  tone: 'Ceria & Jenaka',
  targetAudience: 'Umum',
  isLoading: false,
  error: null,
  result: null,
  refiningState: null,
};

type CopywriterAction =
  | { type: 'SET_IMAGE'; payload: UploadedImage | null }
  | { type: 'SET_FIELD'; payload: { field: keyof CopywriterState; value: string } }
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: CopyResult }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'REFINE_START'; payload: { index: number } }
  | { type: 'REFINE_SUCCESS'; payload: { index: number; newCopy: string } }
  | { type: 'REFINE_ERROR'; payload: string }
  | { type: 'START_OVER' }
  | { type: 'AUTO_DESCRIBE_START' }
  | { type: 'AUTO_DESCRIBE_SUCCESS'; payload: string }
  | { type: 'AUTO_DESCRIBE_ERROR'; payload: string };

function copywriterReducer(state: CopywriterState, action: CopywriterAction): CopywriterState {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...initialState, productImage: action.payload };
    case 'SET_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'GENERATE_START':
      return { ...state, isLoading: true, error: null, result: null };
    case 'GENERATE_SUCCESS':
      return { ...state, isLoading: false, result: action.payload };
    case 'GENERATE_ERROR':
      return { ...state, isLoading: false, error: action.payload, refiningState: null };
    case 'REFINE_START':
      return { ...state, refiningState: { index: action.payload.index, isLoading: true }, error: null };
    case 'REFINE_SUCCESS': {
      if (!state.result) return state;
      const newVariations = [...state.result.copyVariations];
      newVariations[action.payload.index] = action.payload.newCopy;
      return { 
        ...state, 
        refiningState: null, 
        result: { ...state.result, copyVariations: newVariations }
      };
    }
    case 'REFINE_ERROR':
        return { ...state, error: `Gagal menyempurnakan: ${action.payload}`, refiningState: null };
    case 'START_OVER':
      return { ...initialState };
    case 'AUTO_DESCRIBE_START':
      return { ...state, isAutoDescribing: true, productDescription: '' };
    case 'AUTO_DESCRIBE_SUCCESS':
      return { ...state, isAutoDescribing: false, productDescription: action.payload };
    case 'AUTO_DESCRIBE_ERROR':
      return { ...state, isAutoDescribing: false, productDescription: action.payload };
    default:
      return state;
  }
}

// --- Helper Components ---
const SelectInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <select value={value} onChange={onChange} className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
        {children}
      </select>
    </div>
);

const CopyToClipboardButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600/50 backdrop-blur-sm text-white hover:bg-indigo-600 rounded-md transition-colors">
            {copied ? 'Tersalin!' : 'Salin'}
        </button>
    );
}

// --- Mockup Components ---
const InstagramMockup: React.FC<{ image: UploadedImage, copy: string }> = ({ image, copy }) => (
    <div className="bg-white dark:bg-black w-full max-w-sm rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="p-3 flex items-center gap-3 border-b border-gray-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"></div>
            <span className="font-bold text-sm text-gray-800 dark:text-gray-100">NamaBrandAnda</span>
        </div>
        <div className="w-full aspect-square bg-gray-900">
            <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Product" className="w-full h-full object-cover"/>
        </div>
        <div className="p-3 space-y-2">
            <div className="flex items-center gap-4 text-gray-800 dark:text-gray-100">
                <HeartIcon />
                <CommentIcon />
                <SendIcon />
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                <strong className="font-semibold">NamaBrandAnda</strong> {copy}
            </p>
        </div>
    </div>
);

const ShopifyMockup: React.FC<{ image: UploadedImage, copy: string }> = ({ image, copy }) => (
    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-lg shadow-lg overflow-hidden border border-gray-700 p-4 space-y-4">
        <div className="w-full aspect-square bg-gray-900 rounded-md overflow-hidden">
             <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Product" className="w-full h-full object-cover"/>
        </div>
        <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Nama Produk Anda</h1>
            <p className="text-lg font-semibold text-indigo-500 dark:text-indigo-400 mt-1">Rp 199.000</p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap space-y-2">
            {copy.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        </div>
    </div>
);

const FacebookAdMockup: React.FC<{ image: UploadedImage, copy: string }> = ({ image, copy }) => (
    <div className="bg-white dark:bg-[#242526] w-full max-w-sm rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="p-3 space-y-3">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500"></div>
                <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100">Nama Brand Anda</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bersponsor</p>
                </div>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-100">{copy}</p>
        </div>
        <div className="w-full aspect-video bg-gray-900">
             <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Product" className="w-full h-full object-cover"/>
        </div>
        <div className="p-3 bg-gray-100 dark:bg-[#3A3B3C] flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">BRANDANDA.COM</p>
            <button className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-500 text-gray-800 dark:text-white font-bold rounded-md">Beli Sekarang</button>
        </div>
    </div>
);

const EmailSubjectMockup: React.FC<{ copy: string }> = ({ copy }) => (
     <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-lg shadow-lg border border-gray-700 p-4 flex items-center gap-4">
        <input type="checkbox" className="w-4 h-4" />
        <div className="flex-grow">
            <p className="font-bold text-sm text-gray-800 dark:text-white">Nama Brand Anda</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 truncate"><strong className="font-semibold">{copy}</strong> - Jangan lewatkan penawaran spesial ini...</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">10:00</p>
    </div>
);


const RefineControls: React.FC<{ onRefine: (instruction: string) => void, isLoading: boolean }> = ({ onRefine, isLoading }) => {
    const [customInstruction, setCustomInstruction] = useState('');
    const actions = ["Buat lebih pendek", "Tambahkan emoji", "Ganti jadi lebih formal", "Buat lebih persuasif"];

    return (
        <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden">
            <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {actions.map(action => (
                        <button key={action} onClick={() => onRefine(action)} disabled={isLoading} className="px-2 py-1 text-xs bg-gray-600 rounded-md hover:bg-indigo-600 transition disabled:opacity-50">{action}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={customInstruction} onChange={e => setCustomInstruction(e.target.value)} placeholder="Instruksi kustom..." className="flex-grow p-1.5 bg-gray-800 border border-gray-600 rounded-md text-xs" />
                    <button onClick={() => { if(customInstruction.trim()) onRefine(customInstruction); }} disabled={isLoading || !customInstruction.trim()} className="px-3 py-1 text-xs bg-indigo-700 rounded-md hover:bg-indigo-600 transition disabled:opacity-50">Kirim</button>
                </div>
            </div>
        </motion.div>
    );
};

// --- Main Component ---
const AICopywriterPro: React.FC = () => {
  const [state, dispatch] = useReducer(copywriterReducer, initialState);
  const { productImage, productDescription, isAutoDescribing, contentType, tone, targetAudience, isLoading, error, result, refiningState } = state;
  const [activeRefineIndex, setActiveRefineIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (productImage && !productDescription && !isAutoDescribing && !isLoading) {
        const autoDescribe = async () => {
            dispatch({ type: 'AUTO_DESCRIBE_START' });
            try {
                const description = await generateGroundedDescriptionFromImage(productImage);
                dispatch({ type: 'AUTO_DESCRIBE_SUCCESS', payload: description });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Gagal membuat deskripsi otomatis.';
                dispatch({ type: 'AUTO_DESCRIBE_ERROR', payload: `Gagal membuat deskripsi. Coba tulis manual. (${message})` });
            }
        };
        autoDescribe();
    }
  }, [productImage, productDescription, isAutoDescribing, isLoading]);

  const handleGenerate = useCallback(async () => {
    if (!productImage) return;
    dispatch({ type: 'GENERATE_START' });
    try {
      const response = await generateCopywriting(productImage, contentType, tone, productDescription, targetAudience);
      dispatch({ type: 'GENERATE_SUCCESS', payload: response });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      dispatch({ type: 'GENERATE_ERROR', payload: message });
    }
  }, [productImage, contentType, tone, productDescription, targetAudience]);
  
  const handleRefine = useCallback(async (index: number, instruction: string) => {
    if (!result || !productImage) return;
    const originalCopy = result.copyVariations[index];
    dispatch({ type: 'REFINE_START', payload: { index } });
    try {
        const newCopy = await refineCopywriting(productImage, originalCopy, instruction);
        dispatch({ type: 'REFINE_SUCCESS', payload: { index, newCopy } });
        setActiveRefineIndex(null); // Close refine controls on success
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
        dispatch({ type: 'REFINE_ERROR', payload: message });
    }
  }, [result, productImage]);


  const isGenerateDisabled = isLoading || !productImage;

  const renderMockup = (copy: string) => {
      if (!productImage) return null;
      switch (contentType) {
          case 'Caption Instagram':
              return <InstagramMockup image={productImage} copy={copy} />;
          case 'Deskripsi Produk Shopify':
              return <ShopifyMockup image={productImage} copy={copy} />;
          case 'Judul Iklan Facebook':
              return <FacebookAdMockup image={productImage} copy={copy} />;
          case 'Subjek Email':
              return <EmailSubjectMockup copy={copy} />;
          default:
              return <p className="text-sm text-gray-300 whitespace-pre-wrap">{copy}</p>;
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Left Panel */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">1. Unggah Foto & Detail Produk</h2>
          <p className="text-sm text-gray-400">Berikan AI konteks visual dan tekstual.</p>
        </div>
        <ImageUploader onImageUpload={(img) => dispatch({ type: 'SET_IMAGE', payload: img })} image={productImage} />
        {productImage && (
            <div className="relative">
                <textarea
                    value={productDescription}
                    onChange={(e) => dispatch({type: 'SET_FIELD', payload: {field: 'productDescription', value: e.target.value}})}
                    placeholder={isAutoDescribing ? "AI sedang menganalisis & mencari informasi produk..." : "Deskripsi produk, fitur utama, bahan..."}
                    className="w-full h-24 p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm disabled:opacity-70"
                    disabled={isAutoDescribing}
                />
                {isAutoDescribing && (
                    <div className="absolute top-3 right-3 w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                )}
            </div>
        )}
        
        <div>
          <h2 className="text-xl font-bold text-white mb-1">2. Tentukan Kebutuhan Teks</h2>
          <p className="text-sm text-gray-400">Pilih jenis konten dan gaya yang Anda inginkan.</p>
        </div>
        <div className="space-y-4">
          <SelectInput label="Jenis Konten" value={contentType} onChange={(e) => dispatch({type: 'SET_FIELD', payload: {field: 'contentType', value: e.target.value}})}>
            <option>Caption Instagram</option>
            <option>Deskripsi Produk Shopify</option>
            <option>Judul Iklan Facebook</option>
            <option>Subjek Email</option>
          </SelectInput>
           <SelectInput label="Target Audiens" value={targetAudience} onChange={(e) => dispatch({type: 'SET_FIELD', payload: {field: 'targetAudience', value: e.target.value}})}>
            <option>Umum</option>
            <option>Gen Z</option>
            <option>Milenial</option>
            <option>Profesional Muda</option>
            <option>Ibu Rumah Tangga Modern</option>
            <option>Penggemar Olahraga</option>
          </SelectInput>
          <SelectInput label="Nada Bicara" value={tone} onChange={(e) => dispatch({type: 'SET_FIELD', payload: {field: 'tone', value: e.target.value}})}>
            <option>Profesional</option>
            <option>Ceria & Jenaka</option>
            <option>Persuasif & Menjual</option>
            <option>Informatif & Langsung</option>
            <option>Mewah & Eksklusif</option>
          </SelectInput>
        </div>
        
        <button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
          <SparklesIcon />{isLoading ? 'Menulis...' : 'Buat Teks Pemasaran'}
        </button>
      </motion.div>

      {/* Right Panel */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[30rem] flex flex-col">
        <AnimatePresence mode="wait">
          {isLoading && <div className="flex-grow flex items-center justify-center"><Loader message="AI sedang merangkai kata..." /></div>}
          {error && !isLoading && (
            <div className="flex-grow flex items-center justify-center text-center text-red-400">
              <div>
                <h3 className="font-bold text-lg">Oops! Terjadi Kesalahan</h3>
                <p className="text-sm mt-2">{error}</p>
                <button onClick={() => dispatch({type: 'GENERATE_ERROR', payload: ''})} className="mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">OK</button>
              </div>
            </div>
          )}
          {result && !isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Hasil Teks Pemasaran</h3>
                    <div className="space-y-6">
                        {result.copyVariations.map((copy, index) => (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <div className="relative">
                                    {renderMockup(copy)}
                                    <CopyToClipboardButton text={copy} />
                                </div>
                                <div className="mt-4">
                                    <button 
                                        onClick={() => setActiveRefineIndex(activeRefineIndex === index ? null : index)}
                                        className="flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        <SparklesIcon /> {refiningState?.index === index && refiningState.isLoading ? 'Menyempurnakan...' : 'Sempurnakan'}
                                    </button>
                                     <AnimatePresence>
                                        {activeRefineIndex === index && (
                                            <RefineControls 
                                                onRefine={(instruction) => handleRefine(index, instruction)} 
                                                isLoading={!!(refiningState?.index === index && refiningState.isLoading)}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white mb-2">Saran Hashtag</h3>
                    <div className="flex flex-wrap gap-2">
                        {result.hashtags.map(tag => (
                            <span key={tag} className="px-3 py-1 text-sm bg-gray-700 text-indigo-300 rounded-full">#{tag}</span>
                        ))}
                    </div>
                </div>
                <button onClick={() => dispatch({type: 'START_OVER'})} className="w-full mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">Mulai Lagi</button>
              </motion.div>
          )}
          {!isLoading && !error && !result && (
            <div className="flex-grow flex items-center justify-center text-center text-gray-500">
              <div>
                <h3 className="font-bold text-lg text-gray-400">Teks Pemasaran Anda</h3>
                <p className="text-sm mt-1 max-w-sm">Hasil copywriting AI akan muncul di sini, ditampilkan dalam pratinjau yang realistis.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AICopywriterPro;
