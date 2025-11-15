import React from 'react';
import { PhotoStyle } from '../types';
import { STYLE_DEFINITIONS } from '../types';
import { motion } from 'framer-motion';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserFocusIcon } from './icons/UserFocusIcon';
import { ImageIcon } from './icons/ImageIcon';

// --- Icon Components ---
const iconWrapperClass = "w-full h-full";

const MinimalisIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><rect x="5" y="5" width="14" height="14" rx="2"></rect></svg>);
const LifestyleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>);
const EleganIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><path d="M6 3h12l4 6-10 12L2 9l4-6z M2 9h20"></path></svg>);
const DinamisIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>);
const CloseupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const NaturalOrganikIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 2a10 10 0 0 0-10 10h20A10 10 0 0 0 12 2z"></path></svg>);
const KonsepKustomIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconWrapperClass}><path d="m12 19 7-7 3 3-7 7-3-3z"></path><path d="m18 13-1.5-7.5-7.5-1.5-1 5 1 1 5-1z"></path><path d="m2 22 5.5-1.5"></path></svg>);

const styleIcons: Record<PhotoStyle, React.ReactNode> = {
  [PhotoStyle.Minimalis]: <MinimalisIcon />,
  [PhotoStyle.Lifestyle]: <LifestyleIcon />,
  [PhotoStyle.Elegan]: <EleganIcon />,
  [PhotoStyle.Dinamis]: <DinamisIcon />,
  [PhotoStyle.Closeup]: <CloseupIcon />,
  [PhotoStyle.NaturalOrganik]: <NaturalOrganikIcon />,
  [PhotoStyle.ReferenceBackground]: <ImageIcon />,
  [PhotoStyle.ModeFashion]: <UserFocusIcon />,
  [PhotoStyle.KonsepKustom]: <KonsepKustomIcon />,
  [PhotoStyle.Smart]: <SparklesIcon />,
};

interface StyleSelectorProps {
  selectedStyle: PhotoStyle | null;
  onSelectStyle: (style: PhotoStyle) => void;
  disabled?: boolean;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelectStyle, disabled = false }) => {
  const styles = Object.keys(STYLE_DEFINITIONS) as PhotoStyle[];

  return (
    <div className={`grid grid-cols-3 gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {styles.map((style) => {
        const styleInfo = STYLE_DEFINITIONS[style];
        const isSelected = selectedStyle === style;

        return (
          <motion.button
            key={style}
            onClick={() => onSelectStyle(style)}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-3 aspect-square rounded-xl border-2 text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500
              ${isSelected
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
              ${disabled ? 'pointer-events-none' : ''}
            `}
            whileHover={{ y: disabled ? 0 : -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="w-8 h-8 mb-2 flex items-center justify-center">
              {styleIcons[style]}
            </div>
            <span className="text-xs font-semibold leading-tight">{styleInfo.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default StyleSelector;