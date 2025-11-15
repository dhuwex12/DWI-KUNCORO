import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { generateChatTitle } from '../services/geminiService';
import { ChatMessage, ChatSession } from '../types';

// --- Icons ---
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>);
const FileTextIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>);
const CopyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const MarketoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L9.27 9.27L3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73L12 3z"/><path d="M4.5 4.5l1.5 1.5"/><path d="M18 4.5l-1.5 1.5"/><path d="M4.5 19.5l1.5-1.5"/><path d="M18 19.5l-1.5-1.5"/></svg>);

// --- Markdown Component ---
const SimpleMarkdown: React.FC<{ text: string }> = React.memo(({ text }) => {
    const paragraphs = text.split('\n').map((paragraph, pIndex) => {
        if (paragraph.trim().startsWith('* ')) {
            return <li key={pIndex} className="ml-5 list-disc">{paragraph.replace('* ', '')}</li>;
        }
        const parts = paragraph.split(/(\*\*.*?\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
        return <p key={pIndex}>{parts}</p>;
    });
    return <div className="space-y-2">{paragraphs}</div>;
});

// --- Main Component ---
const ChatTechnician: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const chatRef = useRef<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isTitleGenerating = useRef(false);

    // Initial load from localStorage
    useEffect(() => {
        try {
            const storedSessions = localStorage.getItem('chat-technician-sessions');
            if (storedSessions) {
                const parsedSessions: ChatSession[] = JSON.parse(storedSessions);
                if (parsedSessions.length > 0) {
                    setSessions(parsedSessions);
                    setActiveSessionId(parsedSessions[0].id);
                } else {
                    handleNewChat();
                }
            } else {
                handleNewChat();
            }
        } catch (e) {
            console.error("Gagal memuat sesi obrolan:", e);
            handleNewChat();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('chat-technician-sessions', JSON.stringify(sessions));
        }
    }, [sessions]);
    
    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [activeSessionId, sessions, isLoading]);

    // Re-initialize chatRef with correct history when active session changes
    useEffect(() => {
        if (!activeSessionId || sessions.length === 0) return;

        const activeSession = sessions.find(s => s.id === activeSessionId);
        if (activeSession) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const systemInstruction = `You are Marketo, an expert digital marketer and a senior technician for the 'Ultimate AI Product Studio' application. Your primary goal is to act as a consultant to the user, helping them devise powerful marketing strategies for their products using the tools within this studio. You are persuasive, knowledgeable, and your advice has been proven to sell thousands of copies of products monthly. When a user asks a question, relate your answer back to how they can use the 'Spesialis Fotografi', 'Stylo', 'Generator Video Produk', or other studio tools to achieve their marketing goals. Provide actionable, strategic advice. Be encouraging and professional. Always respond in Bahasa Indonesia.`;
            
            const chatHistory = activeSession.history
                .slice(1) // Exclude the initial greeting
                .filter(msg => (msg.parts[0].text && msg.parts[0].text.trim() !== '') || msg.role === 'user');

            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction },
                history: chatHistory,
            });
        }
    }, [activeSessionId, sessions.length]);


    const handleNewChat = () => {
        const newSession: ChatSession = {
            id: `chat-${Date.now()}`,
            title: 'Obrolan Baru',
            createdAt: Date.now(),
            history: [{
                role: 'model',
                parts: [{ text: 'Halo! Saya Marketo, ahli strategi pemasaran digital Anda. Bagaimana saya bisa membantu Anda hari ini?' }],
            }],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setIsLoading(false);
        setInput('');
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatRef.current || isLoading || !activeSessionId) return;
        
        const userMessage = input;
        setInput('');
        setIsLoading(true);

        const currentSessionIndex = sessions.findIndex(s => s.id === activeSessionId);
        if (currentSessionIndex === -1) {
            setIsLoading(false);
            return;
        }

        const isFirstUserMessage = sessions[currentSessionIndex].history.filter(m => m.role === 'user').length === 0;

        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'user', parts: [{ text: userMessage }] }] } : s));

        if (isFirstUserMessage && !isTitleGenerating.current) {
            isTitleGenerating.current = true;
            generateChatTitle(userMessage).then(title => {
                setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title } : s));
            }).finally(() => {
                isTitleGenerating.current = false;
            });
        }
        
        try {
            const stream = await chatRef.current.sendMessageStream({ message: userMessage });
            let modelResponse = '';
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'model', parts: [{ text: '' }] }] } : s));
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setSessions(prev => prev.map(s => {
                    if (s.id === activeSessionId) {
                        const newHistory = [...s.history];
                        newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: modelResponse }] };
                        return { ...s, history: newHistory };
                    }
                    return s;
                }));
            }
        } catch (error) {
            console.error(error);
             setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                    return { ...s, history: [...s.history, { role: 'model', parts: [{ text: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }] }] };
                }
                return s;
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportDocx = () => {
        const activeChat = sessions.find(s => s.id === activeSessionId);
        if (!activeChat) return;
        let content = `<html><head><meta charset="UTF-8"><title>${activeChat.title}</title></head><body><h1>${activeChat.title}</h1>`;
        activeChat.history.forEach(msg => {
            const role = msg.role === 'user' ? 'Anda' : 'Marketo';
            const text = msg.parts[0].text.replace(/\n/g, '<br>');
            content += `<p><strong>${role}:</strong> ${text}</p>`;
        });
        content += '</body></html>';
        const blob = new Blob([content], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${activeChat.title.replace(/ /g, '_')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsMenuOpen(false);
    };

    const handleCopyForGoogleDocs = () => {
        const activeChat = sessions.find(s => s.id === activeSessionId);
        if (!activeChat) return;
        let textContent = `${activeChat.title}\n\n`;
        activeChat.history.forEach(msg => {
            const role = msg.role === 'user' ? 'Anda' : 'Marketo';
            textContent += `${role}:\n${msg.parts[0].text}\n\n`;
        });
        navigator.clipboard.writeText(textContent).then(() => {
            setCopyStatus('copied');
            setTimeout(() => {
                setCopyStatus('idle');
                setIsMenuOpen(false);
            }, 1500);
        });
    };

    const activeChat = sessions.find(s => s.id === activeSessionId);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-[calc(100vh-10rem)] bg-gray-800/50 rounded-2xl border border-gray-700 shadow-lg"
        >
            {/* Left Panel: History */}
            <div className="w-1/3 max-w-xs bg-gray-900/30 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors text-sm">
                        <PlusIcon /> Obrolan Baru
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <button 
                            key={session.id} 
                            onClick={() => setActiveSessionId(session.id)}
                            className={`w-full text-left p-3 rounded-md transition-all text-sm font-medium transform hover:scale-105 ${activeSessionId === session.id ? 'bg-gray-700/80 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            <p className="truncate">{session.title}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Panel: Active Chat */}
            <div className="flex-1 flex flex-col">
                {!activeChat ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">Pilih atau mulai obrolan baru.</div>
                ) : (
                    <>
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h3 className="text-lg font-bold text-white truncate">{activeChat.title}</h3>
                        <div className="relative">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                                <DownloadIcon />
                            </button>
                            <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10"
                                >
                                    <button onClick={handleExportDocx} className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 rounded-t-lg">
                                        <FileTextIcon /> Ekspor ke DOCX
                                    </button>
                                    <button onClick={handleCopyForGoogleDocs} className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 rounded-b-lg">
                                        {copyStatus === 'copied' ? <>Tersalin!</> : <><CopyIcon /> Salin untuk Google Docs</>}
                                    </button>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    </div>
                    
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeChat.history.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                            >
                                {msg.role === 'model' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                        <MarketoIcon />
                                    </div>
                                )}
                                <div className={`max-w-xl p-4 rounded-xl ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-gray-700 text-gray-200 rounded-bl-none'
                                }`}>
                                    <div className="prose prose-invert prose-sm text-white">
                                        <SimpleMarkdown text={msg.parts[0].text} />
                                    </div>
                                </div>
                                {msg.role === 'user' && (
                                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                                        <UserIcon />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-4"
                            >
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                    <MarketoIcon />
                                </div>
                                <div className="max-w-xl p-4 rounded-xl bg-gray-700 text-gray-200 rounded-bl-none">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-700">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ketik pesan Anda di sini..."
                                disabled={isLoading}
                                className="w-full p-3 pr-12 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                            <button type="submit" disabled={isLoading || !input.trim()} className="absolute top-1/2 right-3 -translate-y-1/2 p-2 bg-indigo-600 rounded-md text-white hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default ChatTechnician;