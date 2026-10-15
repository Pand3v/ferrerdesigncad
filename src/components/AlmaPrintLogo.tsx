import React from 'react';

interface AlmaPrintLogoProps {
  customLogoUrl?: string;
  className?: string;
  height?: number | string;
  variant?: 'light' | 'dark'; // 'light' is for dark backgrounds (white text), 'dark' is for light backgrounds (dark text)
}

export const AlmaPrintLogo: React.FC<AlmaPrintLogoProps> = ({
  customLogoUrl,
  className = '',
  height = 54,
  variant = 'light',
}) => {
  if (customLogoUrl && customLogoUrl.trim().length > 0) {
    return (
      <img
        src={customLogoUrl}
        alt="ALMA PRINT"
        style={{ height }}
        className={`object-contain max-h-full max-w-[130px] sm:max-w-[240px] shrink-0 ${className}`}
      />
    );
  }

  const isLightText = variant === 'light';

  const isCompact = typeof height === 'number' && height <= 38;

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 select-none shrink-0 min-w-0 ${className}`}>
      {/* 4-petal flower icon */}
      <svg
        viewBox="0 0 100 100"
        style={{ height }}
        className="w-auto shrink-0 drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-Left petal (Magenta/Purple) */}
        <path
          d="M48 48 C 42 20, 20 10, 18 32 C 16 46, 32 48, 48 48 Z"
          fill="#EC4899"
        />
        {/* Top-Right petal (Cyan/Teal) */}
        <path
          d="M52 48 C 58 20, 80 12, 82 34 C 84 48, 68 48, 52 48 Z"
          fill="#06B6D4"
        />
        {/* Bottom-Left petal (Orange/Amber) */}
        <path
          d="M48 52 C 22 56, 12 76, 34 82 C 48 84, 48 68, 48 52 Z"
          fill="#F59E0B"
        />
        {/* Bottom-Right petal (Lime Green) */}
        <path
          d="M52 52 C 78 56, 86 78, 66 84 C 52 86, 52 68, 52 52 Z"
          fill="#10B981"
        />
        {/* Center accent */}
        <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
      </svg>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none min-w-0">
        <div className={`${isCompact ? 'text-[15px] sm:text-[18px]' : 'text-[22px] sm:text-[25px]'} font-extrabold tracking-tight flex items-baseline ${isLightText ? 'text-white' : 'text-slate-900'} whitespace-nowrap`}>
          <span>ALMA</span>
          <span className="text-emerald-400 font-black ml-1">PRINT</span>
        </div>
        <div className={`${isCompact ? 'text-[7.5px] sm:text-[8px] tracking-[0.14em]' : 'text-[9.5px] tracking-[0.22em]'} font-bold uppercase mt-0.5 ${isLightText ? 'text-emerald-200/80' : 'text-slate-600'} whitespace-nowrap`}>
          Gráfica e Embalagens
        </div>
      </div>
    </div>
  );
};
