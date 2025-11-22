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
        {/* Dentes da engrenagem - 8 dentes uniformes */}
        <g fill="white" opacity="0.9">
          {/* Animação de rotação sutil no centro */}
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="15s"
            repeatCount="indefinite"
          />
          
          {/* Dente 1 - Superior */}
          <rect x="-3" y="-35" width="6" height="10" rx="1"/>
          {/* Dente 2 - Superior direito */}
          <rect x="18" y="-27" width="6" height="10" rx="1" transform="rotate(45 21 -22)"/>
          {/* Dente 3 - Direito */}
          <rect x="28" y="-3" width="10" height="6" rx="1"/>
          {/* Dente 4 - Inferior direito */}
          <rect x="18" y="17" width="6" height="10" rx="1" transform="rotate(-45 21 22)"/>
          {/* Dente 5 - Inferior */}
          <rect x="-3" y="25" width="6" height="10" rx="1"/>
          {/* Dente 6 - Inferior esquerdo */}
          <rect x="-24" y="17" width="6" height="10" rx="1" transform="rotate(45 -21 22)"/>
          {/* Dente 7 - Esquerdo */}
          <rect x="-38" y="-3" width="10" height="6" rx="1"/>
          {/* Dente 8 - Superior esquerdo */}
          <rect x="-24" y="-27" width="6" height="10" rx="1" transform="rotate(-45 -21 -22)"/>
        </g>
        
        {/* Anel externo da engrenagem */}
        <circle cx="0" cy="0" r="22" fill="white" opacity="0.95"/>
        
        {/* Anel interno decorativo */}
        <circle cx="0" cy="0" r="18" fill="url(#primaryGradient)" opacity="0.3"/>
        
        {/* Centro da engrenagem - furo central */}
        <circle cx="0" cy="0" r="8" fill="url(#primaryGradient)" opacity="0.9"/>
        
        {/* Detalhes internos - parafusos decorativos */}
        <g fill="white" opacity="0.6">
          <circle cx="0" cy="-12" r="1.5"/>
          <circle cx="10" cy="-6" r="1.5"/>
          <circle cx="10" cy="6" r="1.5"/>
          <circle cx="0" cy="12" r="1.5"/>
          <circle cx="-10" cy="6" r="1.5"/>
          <circle cx="-10" cy="-6" r="1.5"/>
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
        <span className="text-xs tracking-wider leading-none mt-0.5" style={{ color: '#FF8C00' }}>
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
      <span className="text-xs tracking-wider leading-none" style={{ color: '#FF8C00' }}>AI Sales Sync</span>
    </div>
  );
}
