import React from 'react';

interface PandappaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const PandappaLogo: React.FC<PandappaLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-base', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', text: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { box: 'w-16 h-16', text: 'text-3xl', sub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Original PANDAPPA AI Monogram Hex-Neural Emblem */}
      <div className={`relative ${current.box} flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-md shadow-cyan-500/20 ring-1 ring-white/20 transition-transform hover:scale-105`}>
        <svg
          viewBox="0 0 40 40"
          className="w-3/4 h-3/4 text-white"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Futuristic geometric 'P' & 'A' neural nexus */}
          <path
            d="M10 32V8H22C26.4183 8 30 11.5817 30 16C30 20.4183 26.4183 24 22 24H16V32H10Z"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Internal futuristic diagonal nexus forming 'A' cross */}
          <path
            d="M16 16H22"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="22" cy="16" r="2" fill="#38bdf8" />
          <path
            d="M20 24L28 32"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {/* Subtle ambient light dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-75" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400" />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight ${current.text} bg-gradient-to-r from-slate-100 via-slate-200 to-cyan-300 bg-clip-text text-transparent`}>
              PANDAPPA
            </span>
            <span className={`font-black tracking-widest text-cyan-400 ${current.text}`}>
              AI
            </span>
          </div>
          <span className={`text-slate-400 font-medium tracking-wider uppercase ${current.sub}`}>
            Intelligent Personal Assistant
          </span>
        </div>
      )}
    </div>
  );
};
