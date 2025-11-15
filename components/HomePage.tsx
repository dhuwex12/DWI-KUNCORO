import React from 'react';
import { motion } from 'framer-motion';

interface AppInfo {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
}

interface AppCardProps {
    app: AppInfo;
    onNavigate: (id: string) => void;
}

const AppCard: React.FC<AppCardProps> = ({ app, onNavigate }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.03, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 sm:p-6 flex flex-col cursor-pointer h-full"
            onClick={() => onNavigate(app.id)}
        >
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center bg-indigo-600/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                    {app.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">{app.name}</h3>
            </div>
            
            <p className="text-gray-400 text-xs sm:text-sm flex-grow mb-4">{app.description}</p>
            
            <div className="flex justify-end mt-auto">
                <button className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                    Mulai &rarr;
                </button>
            </div>
        </motion.div>
    );
};


interface HomePageProps {
    apps: AppInfo[];
    onNavigate: (id: string) => void;
}

const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2,
        },
    },
};

const textItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            // FIX: Add 'as const' to ensure TypeScript infers the literal type 'spring'
            // instead of the general 'string' type, which is required by framer-motion's Variants type.
            type: 'spring' as const,
            stiffness: 100,
        },
    },
};


const HomePage: React.FC<HomePageProps> = ({ apps, onNavigate }) => {
    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.2 } }
            }}
            className="flex flex-col gap-8"
        >
            <motion.div 
                variants={textContainerVariants}
                className="text-center mb-8"
            >
                <motion.h1 
                    variants={textItemVariants}
                    className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-4 leading-tight"
                >
                    Selamat Datang di<br />Ultimate AI Product Studio Pro
                </motion.h1>
                <motion.p 
                    variants={textItemVariants}
                    className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto"
                >
                    Satu platform untuk mengubah ide produk Anda menjadi aset pemasaran profesional, ditenagai oleh AI.
                </motion.p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                {apps.map((app, index) => (
                    <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    >
                        <AppCard app={app} onNavigate={onNavigate} />
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default HomePage;
