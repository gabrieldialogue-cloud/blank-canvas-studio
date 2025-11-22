export function AlteseLogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A73E8" />
          <stop offset="100%" stopColor="#003C8F" />
        </linearGradient>
      </defs>
      
      {/* Círculo de fundo */}
      <circle cx="50" cy="50" r="45" fill="url(#primaryGradient)" opacity="0.95"/>
      
      {/* Engrenagem estilizada inspirada no logo original */}
      <g transform="translate(50, 50)">
        {/* Anel externo da engrenagem */}
        <circle cx="0" cy="0" r="28" fill="none" stroke="white" strokeWidth="6" opacity="0.9"/>
        
        {/* Dentes da engrenagem - 6 dentes principais */}
        <g fill="white" opacity="0.9">
          {/* Animação de rotação sutil no centro */}
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="12s"
            repeatCount="indefinite"
          />
          
          {/* Dente superior */}
          <rect x="-4" y="-32" width="8" height="8" rx="1"/>
          {/* Dente superior direito */}
          <rect x="24" y="-16" width="8" height="8" rx="1"/>
          {/* Dente inferior direito */}
          <rect x="24" y="8" width="8" height="8" rx="1"/>
          {/* Dente inferior */}
          <rect x="-4" y="24" width="8" height="8" rx="1"/>
          {/* Dente inferior esquerdo */}
          <rect x="-32" y="8" width="8" height="8" rx="1"/>
          {/* Dente superior esquerdo */}
          <rect x="-32" y="-16" width="8" height="8" rx="1"/>
        </g>
        
        {/* Centro da engrenagem */}
        <circle cx="0" cy="0" r="14" fill="white" opacity="0.95"/>
        
        {/* Elemento central - símbolo euro estilizado ou 'e' */}
        <g fill="url(#primaryGradient)">
          <path d="M -6 -8 L 6 -8 L 6 -4 L -2 -4 L -2 0 L 4 0 L 4 4 L -2 4 L -2 8 L 6 8 L 6 12 L -6 12 L -6 -8 Z" opacity="0.9"/>
        </g>
      </g>
      
      {/* Borda externa */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="2" opacity="0.2"/>
    </svg>
  );
}

export function AlteseLogoHorizontal({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AlteseLogoIcon className="h-10 w-10" />
      <div className="flex flex-col justify-center">
        <span className="text-2xl font-bold tracking-tight text-white leading-none">
          ALTESE
        </span>
        <span className="text-xs text-white/80 tracking-wider leading-none mt-0.5">
          AI Sales Sync
        </span>
      </div>
    </div>
  );
}

export function AlteseLogoText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xl font-bold tracking-tight leading-none">ALTESE</span>
      <span className="text-xs opacity-90 tracking-wider leading-none">AI Sales Sync</span>
    </div>
  );
}
