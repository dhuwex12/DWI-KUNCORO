

import React, { useReducer, useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateVoiceover, generateVoiceSample, refineScriptWithEmotions } from '../services/geminiService';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrashIcon } from './icons/TrashIcon';
import { Actor } from '../types';

// --- Audio Helpers ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createWavBlob(pcmData: Uint8Array, numChannels: number, sampleRate: number, bitsPerSample: number): Blob {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    // chunk size
    view.setUint32(4, 36 + dataSize, true);
    // WAVE format
    writeString(view, 8, 'WAVE');
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    // sub-chunk 1 size
    view.setUint32(16, 16, true);
    // audio format (1 for PCM)
    view.setUint16(20, 1, true);
    // num channels
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * numChannels * bitsPerSample/8)
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    // block align (numChannels * bitsPerSample/8)
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data sub-chunk
    writeString(view, 36, 'data');
    // sub-chunk 2 size
    view.setUint32(40, dataSize, true);

    // Write the PCM data
    const pcm = new Uint8Array(pcmData.buffer);
    for (let i = 0; i < dataSize; i++) {
        view.setUint8(44 + i, pcm[i]);
    }
    
    return new Blob([view], { type: 'audio/wav' });
}


// --- Types & Constants ---
type VoiceQuality = 'standard' | 'pro';
interface CreativeContext {
    targetAudience: string;
    vibe: string;
    contentType: string;
}

// --- State & Reducer ---
interface VoiceoverState {
  currentStep: number;
  script: string;
  actors: Actor[];
  quality: VoiceQuality;
  isLoading: boolean;
  error: string | null;
  audioUrl: string | null;
  auditioningActorId: string | null;
  creativeContext: CreativeContext;
  isRefining: boolean;
  refinedScript: string | null;
  finalScript: string;
}

const initialState: VoiceoverState = {
  currentStep: 1,
  script: '',
  actors: [{ id: `actor-${Date.now()}`, name: 'Narator', voice: 'Kore' }],
  quality: 'standard',
  isLoading: false,
  error: null,
  audioUrl: null,
  auditioningActorId: null,
  creativeContext: {
    targetAudience: 'Umum',
    vibe: 'Profesional',
    contentType: 'Storytelling',
  },
  isRefining: false,
  refinedScript: null,
  finalScript: '',
};

type VoiceoverAction =
  | { type: 'SET_FIELD'; payload: { field: keyof VoiceoverState; value: any } }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'UPDATE_ACTOR_VOICE'; payload: { index: number; voice: string } }
  | { type: 'SET_ACTORS'; payload: Actor[] }
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: string }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'REFINE_START' }
  | { type: 'REFINE_SUCCESS'; payload: string }
  | { type: 'REFINE_ERROR'; payload: string }
  | { type: 'CHOOSE_SCRIPT'; payload: 'original' | 'refined' }
  | { type: 'START_OVER' };

function voiceoverReducer(state: VoiceoverState, action: VoiceoverAction): VoiceoverState {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_STEP': return { ...state, currentStep: action.payload };
    case 'UPDATE_ACTOR_VOICE': {
        const newActors = [...state.actors];
        newActors[action.payload.index] = { ...newActors[action.payload.index], voice: action.payload.voice };
        return { ...state, actors: newActors };
    }
    case 'SET_ACTORS': return { ...state, actors: action.payload };
    case 'GENERATE_START': return { ...state, isLoading: true, error: null, audioUrl: null };
    case 'GENERATE_SUCCESS': return { ...state, isLoading: false, audioUrl: action.payload };
    case 'GENERATE_ERROR': return { ...state, isLoading: false, error: action.payload };
    case 'REFINE_START': return { ...state, isRefining: true, refinedScript: null, error: null };
    case 'REFINE_SUCCESS': return { ...state, isRefining: false, refinedScript: action.payload };
    case 'REFINE_ERROR': return { ...state, isRefining: false, error: action.payload };
    case 'CHOOSE_SCRIPT':
        const finalScript = action.payload === 'refined' && state.refinedScript ? state.refinedScript : state.script;
        return { ...state, finalScript, currentStep: 4, isLoading: false, error: null, audioUrl: null };
    case 'START_OVER': return initialState;
    default: return state;
  }
}

const VOICE_OPTIONS = {
    'Suara Pria': ['Kore', 'Puck', 'Fenrir'],
    'Suara Wanita': ['Zephyr', 'Charon'],
};

const CREATIVE_CONTEXT_OPTIONS = {
    targetAudience: ['Umum', 'Gen Z', 'Milenial', 'Profesional Muda', 'Keluarga'],
    vibe: ['Profesional', 'Ceria & Jenaka', 'Mewah & Eksklusif', 'Hangat & Nyaman', 'Energik'],
    contentType: ['Storytelling', 'Hardselling', 'Softselling', 'Masalah/Solusi', 'Unboxing'],
};

const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const MiniSpinner = () => <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>;

// --- Main Component ---
const AIVoiceoverStudio: React.FC = () => {
  const [state, dispatch] = useReducer(voiceoverReducer, initialState);
  const { currentStep, script, actors, quality, isLoading, error, audioUrl, creativeContext, isRefining, refinedScript, finalScript } = state;
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [auditioningActorId, setAuditioningActorId] = useState<string | null>(null);
  const refinedScriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
        const seededScript = sessionStorage.getItem('voiceover-studio-seed-script');
        if (seededScript) {
            dispatch({ type: 'SET_FIELD', payload: { field: 'script', value: seededScript } });
            sessionStorage.removeItem('voiceover-studio-seed-script');
        }
    } catch (e) { console.error("Gagal memuat naskah yang di-seed:", e); }
  }, []);

  const loadScriptFromSession = useCallback(() => {
    try {
      let scriptToLoad = '';
      const seededScript = sessionStorage.getItem('voiceover-studio-seed-script');
      
      if (seededScript) {
          scriptToLoad = seededScript;
      } else {
          // Fallback to the older script generator output
          const storedData = sessionStorage.getItem('script-generator-output');
          if (storedData) {
            const storyboard = JSON.parse(storedData);
            scriptToLoad = storyboard.fullScript || '';
          }
      }

      if (scriptToLoad) {
        dispatch({ type: 'SET_FIELD', payload: { field: 'script', value: scriptToLoad } });
      } else {
        alert("Tidak ada naskah yang ditemukan dari Ads Storyboard Pro.");
      }
    } catch (e) {
      console.error("Gagal memuat naskah:", e);
      alert("Gagal memuat naskah. Data mungkin rusak.");
    }
}, []);

  useEffect(() => {
    if (!audioContext) {
        setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }));
    }
    return () => { audioContext?.close(); };
  }, [audioContext]);
  
  const handleNextStep = () => {
    if (currentStep === 1) { // After script input
      const actorNames = [...new Set(script.match(/(^\w+:)/gm)?.map(s => s.slice(0, -1).trim()) || ['Narator'])];
      const newActors = actorNames.map(name => {
        const existingActor = actors.find(a => a.name === name);
        return existingActor || { id: `actor-${name}-${Date.now()}`, name, voice: 'Kore' };
      });
      dispatch({ type: 'SET_ACTORS', payload: newActors });
    }
    if(currentStep === 3 && !refinedScript) { // If user skips refinement
      dispatch({ type: 'CHOOSE_SCRIPT', payload: 'original' });
      return;
    }
    dispatch({ type: 'SET_STEP', payload: currentStep + 1 });
  };
  
  const handleAuditionVoice = useCallback(async (actorId: string, voice: string) => {
    if (!audioContext || auditioningActorId) return;
    setAuditioningActorId(actorId);
    try {
        const base64Audio = await generateVoiceSample(voice);
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => { setAuditioningActorId(null); };
    } catch (err) {
        console.error("Gagal memutar sampel suara:", err);
        setAuditioningActorId(null);
    }
  }, [audioContext, auditioningActorId]);
  
  const handleRefineScript = async () => {
    dispatch({ type: 'REFINE_START' });
    try {
        const result = await refineScriptWithEmotions(script, creativeContext);
        dispatch({ type: 'REFINE_SUCCESS', payload: result });
    } catch (e) {
        dispatch({ type: 'REFINE_ERROR', payload: e instanceof Error ? e.message : 'Gagal menyempurnakan naskah' });
    }
  };

  const handleGenerateVoiceover = async () => {
    dispatch({ type: 'GENERATE_START' });
    try {
        const base64Audio = await generateVoiceover(finalScript, actors, quality);
        const audioBytes = decode(base64Audio);
        // Correctly create a WAV blob with a proper header from raw PCM data
        const blob = createWavBlob(audioBytes, 1, 24000, 16);
        const url = URL.createObjectURL(blob);
        dispatch({ type: 'GENERATE_SUCCESS', payload: url });
    } catch (e) {
        dispatch({ type: 'GENERATE_ERROR', payload: e instanceof Error ? e.message : 'Gagal membuat audio' });
    }
  };

  const stepReady = [
      true, // Step 1
      script.trim().length > 0, // Step 2
      actors.length > 0, // Step 3
      finalScript.trim().length > 0, // Step 4
  ];
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-white">Langkah 1: Naskah</h3>
                <button onClick={loadScriptFromSession} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                    Muat Naskah dari Ads Storyboard Pro?
                </button>
            </div>
          <textarea
            value={script}
            onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'script', value: e.target.value } })}
            placeholder="Tulis naskah Anda di sini. Gunakan format 'NamaAktor: Dialog' untuk beberapa pembicara."
            className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-sm"
          />
        </div>
      );
      case 2: return (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Langkah 2: Casting Aktor Suara</h3>
          <div className="space-y-4">
            {actors.map((actor, index) => (
              <div key={actor.id} className="grid grid-cols-3 gap-4 items-center">
                <input
                  type="text"
                  value={actor.name}
                  readOnly
                  className="p-2 bg-gray-700 border border-gray-600 rounded-lg col-span-1"
                />
                <select
                  value={actor.voice}
                  onChange={(e) => dispatch({ type: 'UPDATE_ACTOR_VOICE', payload: { index, voice: e.target.value } })}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg col-span-1"
                >
                  {Object.entries(VOICE_OPTIONS).map(([groupName, voices]) => (
                    <optgroup label={groupName} key={groupName}>
                      {voices.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button
                    onClick={() => handleAuditionVoice(actor.id, actor.voice)}
                    disabled={!!auditioningActorId}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 rounded-lg text-sm hover:bg-gray-500 disabled:opacity-50"
                >
                    {auditioningActorId === actor.id ? <MiniSpinner/> : <PlayIcon />} Audisi
                </button>
              </div>
            ))}
          </div>
        </div>
      );
       case 3: return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Langkah 3: Arahan Sutradara AI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {Object.entries(CREATIVE_CONTEXT_OPTIONS).map(([key, options]) => (
                    <div key={key}>
                        <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                        <select
                            value={creativeContext[key as keyof CreativeContext]}
                            onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'creativeContext', value: { ...creativeContext, [key]: e.target.value } } })}
                            className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg"
                        >
                            {options.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                    </div>
                ))}
            </div>
            {!refinedScript && (
                <button onClick={handleRefineScript} disabled={isRefining} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                    <SparklesIcon /> {isRefining ? 'Menyempurnakan...' : 'Sempurnakan Naskah dengan AI'}
                </button>
            )}
            
            <AnimatePresence>
                {refinedScript && (
                    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="mt-4">
                        <h4 className="font-bold text-white mb-2">Perbandingan Naskah</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h5 className="text-sm font-semibold text-gray-400 mb-1">Versi Asli</h5>
                                <textarea readOnly value={script} className="w-full h-48 p-2 text-xs bg-gray-900 border border-gray-600 rounded-lg" />
                            </div>
                            <div>
                                 <h5 className="text-sm font-semibold text-green-400 mb-1">Versi AI</h5>
                                <textarea ref={refinedScriptTextareaRef} defaultValue={refinedScript} className="w-full h-48 p-2 text-xs bg-gray-900 border border-green-500 rounded-lg" />
                            </div>
                        </div>
                         <div className="flex justify-center gap-4 mt-4">
                            <button onClick={() => dispatch({type: 'CHOOSE_SCRIPT', payload: 'original'})} className="px-4 py-2 bg-gray-600 rounded-lg font-semibold hover:bg-gray-500">Gunakan Versi Asli</button>
                            <button onClick={() => {
                                const finalRefinedScript = refinedScriptTextareaRef.current?.value || refinedScript;
                                dispatch({ type: 'SET_FIELD', payload: { field: 'refinedScript', value: finalRefinedScript } });
                                dispatch({ type: 'CHOOSE_SCRIPT', payload: 'refined' });
                            }} className="px-4 py-2 bg-green-600 rounded-lg font-bold hover:bg-green-500">Gunakan Versi AI</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      );
      case 4: return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Langkah 4: Produksi Final</h3>
            <div className="space-y-4">
                <textarea readOnly value={finalScript} className="w-full h-48 p-2 text-sm bg-gray-900 border border-gray-600 rounded-lg" />
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Kualitas:</label>
                    <div className="flex gap-2">
                        <button onClick={() => dispatch({type: 'SET_FIELD', payload: {field: 'quality', value: 'standard'}})} className={`px-3 py-1 text-sm rounded-full ${quality === 'standard' ? 'bg-indigo-600' : 'bg-gray-600'}`}>Standar</button>
                        <button onClick={() => dispatch({type: 'SET_FIELD', payload: {field: 'quality', value: 'pro'}})} className={`px-3 py-1 text-sm rounded-full ${quality === 'pro' ? 'bg-indigo-600' : 'bg-gray-600'}`}>Pro</button>
                    </div>
                </div>
                <button onClick={handleGenerateVoiceover} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                    {isLoading ? 'Membuat...' : 'Buat Voiceover'}
                </button>
                {isLoading && <Loader message="AI sedang merekam suara..." />}
                {audioUrl && (
                    <motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
                        <audio controls src={audioUrl} className="w-full mt-4" />
                        <a href={audioUrl} download="ai_voiceover.wav" className="mt-2 text-indigo-400 hover:underline text-sm block text-center">Unduh File WAV</a>
                    </motion.div>
                )}
            </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Studio Voiceover AI</h1>
        <p className="text-center text-gray-400 mb-8">Ubah naskah Anda menjadi rekaman suara profesional dengan beberapa langkah mudah.</p>

        <div className="flex justify-between items-center mb-8">
            {[1, 2, 3, 4].map(step => (
                <React.Fragment key={step}>
                    <div className={`flex items-center gap-2 ${currentStep >= step ? 'text-indigo-400' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= step ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600'}`}>
                            {step}
                        </div>
                        <span className="hidden sm:inline">{['Naskah', 'Aktor', 'Arahan', 'Produksi'][step - 1]}</span>
                    </div>
                    {step < 4 && <div className={`flex-grow h-0.5 mx-4 ${currentStep > step ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>}
                </React.Fragment>
            ))}
        </div>

      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
        <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {renderStepContent()}
            </motion.div>
        </AnimatePresence>
        
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        <div className="flex justify-between mt-6">
          <button onClick={() => dispatch({ type: 'SET_STEP', payload: currentStep - 1 })} disabled={currentStep === 1} className="px-6 py-2 bg-gray-600 rounded-lg font-bold hover:bg-gray-500 disabled:opacity-50">Kembali</button>
          {currentStep < 3 && <button onClick={handleNextStep} disabled={!stepReady[currentStep]} className="px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed">Lanjut</button>}
        </div>
      </div>
       <button onClick={() => dispatch({ type: 'START_OVER' })} className="w-full mt-6 bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Mulai Lagi dari Awal</button>
    </div>
  );
};

export default AIVoiceoverStudio;
