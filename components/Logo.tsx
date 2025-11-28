import React from 'react';

interface LogoProps {
  className?: string;
  inverted?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", inverted = false }) => {
  const strokeColor = inverted ? "white" : "url(#logo-gradient)";
  const strokeColorSecondary = inverted ? "rgba(255,255,255,0.5)" : "url(#logo-gradient-secondary)";

  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="logo-gradient-secondary" x1="40" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {/* S Shape constructed from two interlocking continuous loops */}
      <path 
        d="M12 14C12 9.58172 15.5817 6 20 6C24.4183 6 28 9.58172 28 14V26C28 30.4183 24.4183 34 20 34C15.5817 34 12 30.4183 12 26" 
        stroke={strokeColor} 
        strokeWidth="4" 
        strokeLinecap="round" 
      />
      <path 
        d="M28 26C28 30.4183 24.4183 34 20 34" 
        stroke={strokeColorSecondary} 
        strokeWidth="4" 
        strokeLinecap="round"
        strokeDasharray="4 6" 
        className="opacity-50"
      />
       <path 
        d="M12 14C12 9.58172 15.5817 6 20 6" 
        stroke={strokeColorSecondary} 
        strokeWidth="4" 
        strokeLinecap="round"
        strokeDasharray="4 6" 
        className="opacity-50"
      />
    </svg>
  );
};