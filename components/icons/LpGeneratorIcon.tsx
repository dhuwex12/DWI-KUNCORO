import React from 'react';

export const LpGeneratorIcon: React.FC = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="w-5 h-5"
    >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        {/* Sparkles */}
        <path d="M12 12.5 11.5 11l-1.5-0.5 1.5-0.5L11.5 9l0.5 1.5 1.5 0.5-1.5 0.5z" />
        <path d="M17 17.5 16.5 16l-1.5-0.5 1.5-0.5L16.5 14l0.5 1.5 1.5 0.5-1.5 0.5z" />
        <path d="M9 17.5 8.5 16l-1.5-0.5 1.5-0.5L8.5 14l0.5 1.5 1.5 0.5-1.5 0.5z" />
    </svg>
);
