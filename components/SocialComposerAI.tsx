import React, { useReducer, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedImage } from '../types';
import ImageUploader from './ImageUploader';

// --- Helper Components for Mockups ---
const InstagramPostMockup: React.FC<{ productImg?: string; logoImg?: string; headline?: string; cta?: string }> = ({ productImg, logoImg, headline, cta }) => (
    <div className="bg-white dark:bg-black w-full max-w-sm rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
            {logoImg ? <img src={logoImg} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>}
            <span className="font-bold text-sm text-gray-800 dark:text-gray-100">NamaBrandAnda</span>
        </div>
        <div className="w-full aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            {productImg ? <img src={productImg} className="w-full h-full object-cover" /> : <span className="text-gray-400">Gambar Produk</span>}
        </div>
        <div className="p-3 text-sm text-gray-800 dark:text-gray-100">
            <p><strong className="font-bold">NamaBrandAnda</strong> {headline || "Headline menarik Anda akan muncul di sini."}</p>
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <button className="w-full text-center py-2 bg-blue-500 text-white font-bold rounded-md text-sm">{cta || "Beli Sekarang"}</button>
        </div>
    </div>
);

const InstagramStoryMockup: React.FC<{ productImg?: string; logoImg?: string; headline?: string; cta?: string }> = ({ productImg, logoImg, headline, cta }) => (
    <div className="w-full max-w-[200px] aspect-[9/16] bg-gray-800 rounded-2xl shadow-lg overflow-hidden border-2 border-gray-700 relative flex flex-col p-4">
        {productImg ? <img src={productImg} className="absolute inset-0 w-full h-full object-cover -z-10" /> : <div className="absolute inset-0 bg-gray-900 -z-10"></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent -z-10"></div>
        <div className="flex items-center gap-2">
            {logoImg ? <img src={logoImg} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-700"></div>}
            <span className="font-bold text-sm text-white">NamaBrandAnda</span>
        </div>
        <div className="flex-grow"></div>
        <p className="text-white text-center font-bold text-lg mb-4">{headline || "Headline Menarik"}</p>
        <button className="w-full text-center py-2.5 bg-white text-black font-bold rounded-md text-sm">{cta || "Beli Sekarang"}</button>
    </div>
);


// --- State & Reducer ---
interface ComposerState {
  productImage: UploadedImage | null;
  logoImage: UploadedImage | null;
  headline: string;
  description: string;
  cta: string;
  showMockups: boolean;
}

const initialState: ComposerState = {
  productImage: null,
  logoImage: null,
  headline: '',
  description: '',
  cta: 'Beli Sekarang',
  showMockups: false,
};

type ComposerAction =
  | { type: 'SET_IMAGE'; payload: { field: 'productImage' | 'logoImage'; value: UploadedImage | null } }
  | { type: 'SET_TEXT'; payload: { field: 'headline' | 'description' | 'cta'; value: string } }
  | { type: 'SHOW_MOCKUPS' }
  | { type: 'START_OVER' };

function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_TEXT':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SHOW_MOCKUPS':
      return { ...state, showMockups: true };
    case 'START_OVER':
      return { ...initialState };
    default:
      return state;
  }
}

// --- Main Component ---
const SocialComposerAI: React.FC = () => {
  const [state, dispatch] = useReducer(composerReducer, initialState);
  const { productImage, logoImage, headline, description, cta, showMockups } = state;

  const productImageUrl = productImage ? `data:${productImage.mimeType};base64,${productImage.base64}` : undefined;
  const logoImageUrl = logoImage ? `data:${logoImage.mimeType};base64,${logoImage.base64}` : undefined;
  
  const isGenerateDisabled = !productImage || !logoImage || !headline.trim();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Left Panel */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">1. Unggah Aset Visual</h2>
          <p className="text-sm text-gray-400">Sediakan gambar produk dan logo brand Anda.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gambar Produk</label>
                <ImageUploader onImageUpload={(img) => dispatch({type: 'SET_IMAGE', payload: {field: 'productImage', value: img}})} image={productImage} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Logo Brand</label>
                <ImageUploader onImageUpload={(img) => dispatch({type: 'SET_IMAGE', payload: {field: 'logoImage', value: img}})} image={logoImage} />
            </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-white mb-1">2. Masukkan Teks Iklan</h2>
          <p className="text-sm text-gray-400">Tulis headline dan deskripsi yang menarik.</p>
        </div>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Headline</label>
                <input type="text" value={headline} onChange={e => dispatch({type: 'SET_TEXT', payload: {field: 'headline', value: e.target.value}})} placeholder="Contoh: Diskon Terbatas 50%!" className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tombol Call-to-Action (CTA)</label>
                <select value={cta} onChange={e => dispatch({type: 'SET_TEXT', payload: {field: 'cta', value: e.target.value}})} className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg">
                    <option>Beli Sekarang</option>
                    <option>Pelajari Lebih Lanjut</option>
                    <option>Daftar</option>
                    <option>Unduh</option>
                </select>
            </div>
        </div>
        
        <button onClick={() => dispatch({type: 'SHOW_MOCKUPS'})} disabled={isGenerateDisabled} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-50">
            Buat Mockup Iklan
        </button>
      </motion.div>

      {/* Right Panel */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[30rem] flex flex-col">
        <AnimatePresence mode="wait">
          {!showMockups && (
            <div className="flex-grow flex items-center justify-center text-center text-gray-500">
              <div>
                <h3 className="font-bold text-lg text-gray-400">Pratinjau Mockup Iklan</h3>
                <p className="text-sm mt-1 max-w-sm">Mockup iklan media sosial Anda akan muncul di sini.</p>
              </div>
            </div>
          )}
          {showMockups && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pratinjau Mockup Iklan Anda</h3>
                 <div className="flex flex-wrap items-start justify-center gap-8">
                     <div className="flex-shrink-0">
                         <h4 className="font-semibold text-center mb-2">Instagram Post (1:1)</h4>
                         <InstagramPostMockup productImg={productImageUrl} logoImg={logoImageUrl} headline={headline} cta={cta} />
                     </div>
                     <div className="flex-shrink-0">
                         <h4 className="font-semibold text-center mb-2">Instagram Story (9:16)</h4>
                         <InstagramStoryMockup productImg={productImageUrl} logoImg={logoImageUrl} headline={headline} cta={cta} />
                     </div>
                 </div>
                <button onClick={() => dispatch({type: 'START_OVER'})} className="w-full mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">Mulai Lagi</button>
              </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SocialComposerAI;