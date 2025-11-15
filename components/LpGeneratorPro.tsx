import React, { useReducer, useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedImage, LpGoal, LpFramework, LpResult, LpSection } from '../types';
import { generateLandingPageScript, regenerateLpSectionScript, identifyProduct } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { InfoIcon } from './icons/InfoIcon';

// --- Local Icons ---
const ArrowRightIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const ClipboardIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const DownloadFileIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="15 15 12 18 9 15"></polyline></svg>;
const CameraIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const VideoIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>;
const CopywriterIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>;
const PosterIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4.5A2.5 2.5 0 0 1 2 18.5V5.5A2.5 2.5 0 0 1 4.5 3z"/><path d="m14 7-4.27 4.27a1 1 0 0 0-.29.71v3.02"/><path d="M7 12h3"/></svg>;

// --- State & Reducer ---
interface LpState {
  currentStep: number;
  productImage: UploadedImage | null;
  productName: string;
  isIdentifying: boolean;
  targetAudience: string;
  lpGoal: LpGoal;
  framework: LpFramework;
  isLoading: boolean;
  error: string | null;
  result: LpResult | null;
  regeneratingSection: string | null;
}

const initialState: LpState = {
  currentStep: 1,
  productImage: null,
  productName: '',
  isIdentifying: false,
  targetAudience: 'Anak muda penggemar fashion',
  lpGoal: 'Penjualan Langsung (Hard Sell)',
  framework: 'AI-Recommended',
  isLoading: false,
  error: null,
  result: null,
  regeneratingSection: null,
};

type Action =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_IMAGE'; payload: UploadedImage | null }
  | { type: 'IDENTIFY_START' }
  | { type: 'IDENTIFY_SUCCESS'; payload: string }
  | { type: 'SET_FIELD'; payload: { field: keyof LpState; value: any } }
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: LpResult }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'REGENERATE_START'; payload: string }
  | { type: 'REGENERATE_SUCCESS'; payload: { sectionId: string; content: string } }
  | { type: 'REGENERATE_ERROR'; payload: string }
  | { type: 'START_OVER' };

function reducer(state: LpState, action: Action): LpState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, currentStep: action.payload };
    case 'SET_IMAGE': return { ...state, productImage: action.payload, productName: '' };
    case 'IDENTIFY_START': return { ...state, isIdentifying: true };
    case 'IDENTIFY_SUCCESS': return { ...state, isIdentifying: false, productName: action.payload };
    case 'SET_FIELD': return { ...state, [action.payload.field]: action.payload.value };
    case 'GENERATE_START': return { ...state, isLoading: true, error: null };
    case 'GENERATE_SUCCESS': return { ...state, isLoading: false, result: action.payload, currentStep: 3 };
    case 'GENERATE_ERROR': return { ...state, isLoading: false, error: action.payload };
    case 'REGENERATE_START': return { ...state, regeneratingSection: action.payload };
    case 'REGENERATE_SUCCESS': {
        if (!state.result) return state;
        const newScript = { ...state.result.script };
        newScript[action.payload.sectionId].content = action.payload.content;
        return { ...state, regeneratingSection: null, result: { ...state.result, script: newScript } };
    }
    case 'REGENERATE_ERROR': return { ...state, regeneratingSection: null, error: action.payload };
    case 'START_OVER': return { ...initialState };
    default: return state;
  }
}

interface LpGeneratorProProps {
    onNavigateToApp: (appId: string) => void;
}

const LpGeneratorPro: React.FC<LpGeneratorProProps> = ({ onNavigateToApp }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currentStep, productImage, productName, isIdentifying, targetAudience, lpGoal, framework, isLoading, error, result, regeneratingSection } = state;
  const [openSection, setOpenSection] = useState<string | null>('hero');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (productImage && !productName) {
      const identify = async () => {
        dispatch({ type: 'IDENTIFY_START' });
        try {
          const name = await identifyProduct(productImage);
          dispatch({ type: 'IDENTIFY_SUCCESS', payload: name });
        } catch (e) {
          dispatch({ type: 'SET_FIELD', payload: { field: 'productName', value: 'Gagal identifikasi, isi manual' }});
        }
      };
      identify();
    }
  }, [productImage, productName]);
  
  const handleGenerate = async () => {
    if (!productImage || !productName) return;
    dispatch({ type: 'GENERATE_START' });
    try {
        const res = await generateLandingPageScript(productImage, productName, targetAudience, lpGoal, framework);
        dispatch({ type: 'GENERATE_SUCCESS', payload: res });
    } catch (err) {
        dispatch({ type: 'GENERATE_ERROR', payload: err instanceof Error ? err.message : 'Terjadi kesalahan' });
    }
  };

  const handleRegenerateSection = async (section: LpSection) => {
    if (!productImage || !productName || !result) return;
    dispatch({ type: 'REGENERATE_START', payload: section.id });
     try {
        const newContent = await regenerateLpSectionScript(productName, targetAudience, lpGoal, result.framework, section.id, result.script);
        dispatch({ type: 'REGENERATE_SUCCESS', payload: { sectionId: section.id, content: newContent } });
    } catch (err) {
        dispatch({ type: 'REGENERATE_ERROR', payload: err instanceof Error ? err.message : 'Gagal membuat ulang' });
    }
  };

  const handleSendTo = (appId: string, data: any) => {
    sessionStorage.setItem(`${appId}-seed`, JSON.stringify(data));
    onNavigateToApp(appId);
  }
  
  const fullScriptText = useMemo(() => {
      if (!result) return '';
      // FIX: Add explicit type to map parameter to resolve 'unknown' type errors.
      return Object.values(result.script).map((s: LpSection) => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
  }, [result]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullScriptText).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleDownload = () => {
      const blob = new Blob([fullScriptText], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productName.replace(/\s/g, '_')}_landing_page.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const stepReady = [
      true, // Step 1 always ready
      !!productImage && !!productName, // Step 2 ready when image is uploaded and identified
      !!result, // Step 3/4 ready when script is generated
      !!result,
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">LP Generator Pro: Arsitek Konversi Anda</h1>
      <p className="text-center text-gray-400 mb-8">Rancang naskah landing page yang menjual dalam 4 langkah mudah.</p>

      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-8">
        {[1,2,3,4].map(step => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-2 ${currentStep >= step ? 'text-indigo-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= step ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600'}`}>
                {step}
              </div>
              <span className="hidden sm:inline">{['Pondasi', 'Kerangka', 'Naskah', 'Ekspor'][step-1]}</span>
            </div>
            {step < 4 && <div className={`flex-grow h-0.5 mx-4 ${currentStep > step ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>}
          </React.Fragment>
        ))}
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {currentStep === 1 && (
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Langkah 1: Pondasi Strategis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Gambar Produk</label>
                        <ImageUploader onImageUpload={(img) => dispatch({ type: 'SET_IMAGE', payload: img })} image={productImage} />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nama Produk</label>
                            <input type="text" value={productName} onChange={e => dispatch({type:'SET_FIELD', payload: {field: 'productName', value: e.target.value}})} disabled={isIdentifying} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Target Audiens</label>
                            <select value={targetAudience} onChange={e => dispatch({type:'SET_FIELD', payload: {field: 'targetAudience', value: e.target.value}})} className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg">
                                <option>Anak muda penggemar fashion</option>
                                <option>Ibu rumah tangga modern</option>
                                <option>Profesional sibuk</option>
                                <option>Penggemar teknologi</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Tujuan Utama Landing Page</label>
                            <select value={lpGoal} onChange={e => dispatch({type:'SET_FIELD', payload: {field: 'lpGoal', value: e.target.value}})} className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg">
                                <option>Penjualan Langsung (Hard Sell)</option>
                                <option>Mengumpulkan Prospek/Leads (Email/No. HP)</option>
                                <option>Pendaftaran Webinar/Acara</option>
                            </select>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end mt-6">
                    <button onClick={() => dispatch({type: 'SET_STEP', payload: 2})} disabled={!stepReady[1]} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed">Lanjut <ArrowRightIcon /></button>
                </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Langkah 2: Kerangka Kerja Psikologis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['AI-Recommended', 'AIDA', 'PAS'] as LpFramework[]).map(f => (
                        <button key={f} onClick={() => dispatch({type:'SET_FIELD', payload: {field: 'framework', value: f}})} className={`p-4 rounded-lg border-2 text-left transition-all ${framework === f ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-700/50 border-gray-600 hover:border-indigo-600'}`}>
                            <h4 className="font-bold">{f}</h4>
                            <p className="text-xs text-gray-400 mt-1">{
                                f === 'AIDA' ? 'Attention, Interest, Desire, Action. Klasik untuk membangun rasa ingin tahu.' :
                                f === 'PAS' ? 'Problem, Agitate, Solution. Fokus pada "rasa sakit" pelanggan.' :
                                'Biarkan AI memilih kerangka terbaik berdasarkan produk Anda.'
                            }</p>
                        </button>
                    ))}
                </div>
                <div className="flex justify-between mt-6">
                    <button onClick={() => dispatch({type: 'SET_STEP', payload: 1})} className="px-6 py-2 bg-gray-600 rounded-lg font-bold hover:bg-gray-500">Kembali</button>
                    <button onClick={handleGenerate} disabled={isLoading} className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 disabled:bg-gray-600 w-48">
                        {isLoading ? <Loader message=""/> : <><SparklesIcon /> Buat Naskah</>}
                    </button>
                </div>
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
          )}
          {(currentStep === 3 || currentStep === 4) && result && (
             <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Langkah 3: Naskah Anda (Framework: {result.framework})</h3>
                <div className="space-y-2">
                    {/* // FIX: Add explicit type to map parameter to resolve 'unknown' type errors. */}
                    {Object.values(result.script).map((section: LpSection) => (
                         <div key={section.id} className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                            <button onClick={() => setOpenSection(openSection === section.id ? null : section.id)} className="w-full p-4 flex justify-between items-center text-left">
                                <h4 className="font-semibold text-white">{section.title}</h4>
                                <ArrowRightIcon />
                            </button>
                            <AnimatePresence>
                            {openSection === section.id && (
                                <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} className="overflow-hidden">
                                    <div className="p-4 border-t border-gray-700 space-y-4">
                                        <div className="prose prose-sm prose-invert max-w-none text-gray-300 whitespace-pre-wrap">{section.content}</div>
                                        <div className="flex items-center gap-2 bg-gray-800/70 p-2 rounded-md text-xs italic">
                                            <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                            <span>{section.pro_tip}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handleSendTo('photography', { prompt: section.content })} className="flex items-center gap-1.5 text-xs bg-gray-700 px-2 py-1 rounded-md hover:bg-gray-600"><CameraIcon /> Foto</button>
                                                <button onClick={() => handleSendTo('video', { prompt: section.content })} className="flex items-center gap-1.5 text-xs bg-gray-700 px-2 py-1 rounded-md hover:bg-gray-600"><VideoIcon /> Video</button>
                                                <button onClick={() => handleSendTo('copywriter', { description: section.content })} className="flex items-center gap-1.5 text-xs bg-gray-700 px-2 py-1 rounded-md hover:bg-gray-600"><CopywriterIcon /> Copy</button>
                                                <button onClick={() => handleSendTo('poster', { body: section.content })} className="flex items-center gap-1.5 text-xs bg-gray-700 px-2 py-1 rounded-md hover:bg-gray-600"><PosterIcon /> Poster</button>
                                            </div>
                                            <button onClick={() => handleRegenerateSection(section)} disabled={!!regeneratingSection} className="flex items-center gap-1 text-xs px-3 py-1 bg-indigo-700 rounded-md hover:bg-indigo-600 disabled:opacity-50">
                                                {regeneratingSection === section.id ? 'Membuat ulang...' : 'Buat Ulang Bagian Ini'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                         </div>
                    ))}
                </div>
                 {currentStep === 4 && (
                     <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-bold mb-4">Langkah 4: Ekspor & Integrasi</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gray-600 rounded-lg font-bold hover:bg-gray-500"><ClipboardIcon /> {copyStatus === 'copied' ? 'Tersalin!' : 'Salin Naskah'}</button>
                            <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-green-600 rounded-lg font-bold hover:bg-green-500"><DownloadFileIcon /> Unduh (.md)</button>
                        </div>
                    </div>
                 )}
                <div className="flex justify-between mt-6">
                    <button onClick={() => dispatch({type: 'SET_STEP', payload: 2})} className="px-6 py-2 bg-gray-600 rounded-lg font-bold hover:bg-gray-500">Kembali</button>
                    {currentStep === 3 && <button onClick={() => dispatch({type: 'SET_STEP', payload: 4})} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500">Lanjut ke Ekspor <ArrowRightIcon /></button>}
                </div>
             </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LpGeneratorPro;