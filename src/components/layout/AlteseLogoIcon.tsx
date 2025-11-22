export function AlteseLogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#003C8F" />
          <stop offset="100%" stopColor="#1A73E8" />
        </linearGradient>
        <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FF5722" />
        </linearGradient>
        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#00C853" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.25"/>
        </filter>
      </defs>
      
      {/* Escudo/Badge externo - representando confiança e qualidade */}
      <path
        d="M 50 5 L 80 15 L 88 45 L 80 75 L 50 95 L 20 75 L 12 45 L 20 15 Z"
        fill="url(#blueGradient)"
        filter="url(#shadow)"
      />
      
      {/* Engrenagem grande - símbolo de mecânica e autopeças */}
      <g transform="translate(50, 50)">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur="8s"
          repeatCount="indefinite"
        />
        
        {/* Centro da engrenagem */}
        <circle cx="0" cy="0" r="12" fill="white" opacity="0.95"/>
        
        {/* Dentes da engrenagem - 8 dentes */}
        <g fill="white" opacity="0.9">
          {/* Dente superior */}
          <rect x="-3" y="-22" width="6" height="10" rx="1"/>
          {/* Dente superior direito */}
          <rect x="12" y="-18" width="10" height="6" rx="1" transform="rotate(45 17 -15)"/>
          {/* Dente direito */}
          <rect x="16" y="-3" width="10" height="6" rx="1"/>
          {/* Dente inferior direito */}
          <rect x="12" y="12" width="10" height="6" rx="1" transform="rotate(-45 17 15)"/>
          {/* Dente inferior */}
          <rect x="-3" y="16" width="6" height="10" rx="1"/>
          {/* Dente inferior esquerdo */}
          <rect x="-22" y="12" width="10" height="6" rx="1" transform="rotate(45 -17 15)"/>
          {/* Dente esquerdo */}
          <rect x="-26" y="-3" width="10" height="6" rx="1"/>
          {/* Dente superior esquerdo */}
          <rect x="-22" y="-18" width="10" height="6" rx="1" transform="rotate(-45 -17 -15)"/>
        </g>
        
        {/* Furo central da engrenagem */}
        <circle cx="0" cy="0" r="5" fill="url(#blueGradient)"/>
      </g>
      
      {/* Chave inglesa cruzando - ferramenta clássica de mecânica */}
      <g transform="translate(50, 50) rotate(-45)">
        <rect x="-2" y="-25" width="4" height="35" fill="url(#orangeGradient)" rx="1" opacity="0.9"/>
        <path
          d="M -4 -25 L -6 -28 L -6 -32 L -2 -32 L 2 -32 L 6 -32 L 6 -28 L 4 -25 Z"
          fill="url(#orangeGradient)"
          opacity="0.9"
        />
      </g>
      
      {/* Elementos decorativos - parafusos nos cantos */}
      <g fill="url(#greenGradient)" opacity="0.7">
        <circle cx="25" cy="25" r="3">
          <animate attributeName="opacity" values="0.7;0.4;0.7" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="75" cy="25" r="3">
          <animate attributeName="opacity" values="0.7;0.4;0.7" dur="3s" begin="0.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="25" cy="75" r="3">
          <animate attributeName="opacity" values="0.7;0.4;0.7" dur="3s" begin="1s" repeatCount="indefinite"/>
        </circle>
        <circle cx="75" cy="75" r="3">
          <animate attributeName="opacity" values="0.7;0.4;0.7" dur="3s" begin="1.5s" repeatCount="indefinite"/>
        </circle>
      </g>
      
      {/* Linhas de detalhe nos parafusos */}
      <g stroke="white" strokeWidth="0.8" opacity="0.4">
        <line x1="23" y1="25" x2="27" y2="25"/>
        <line x1="73" y1="25" x2="77" y2="25"/>
        <line x1="23" y1="75" x2="27" y2="75"/>
        <line x1="73" y1="75" x2="77" y2="75"/>
      </g>
      
      {/* Borda externa do escudo */}
      <path
        d="M 50 5 L 80 15 L 88 45 L 80 75 L 50 95 L 20 75 L 12 45 L 20 15 Z"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />
      
      {/* Detalhes internos - linhas de velocidade */}
      <g stroke="url(#orangeGradient)" strokeWidth="1.5" opacity="0.2">
        <line x1="15" y1="30" x2="22" y2="30"/>
        <line x1="15" y1="40" x2="25" y2="40"/>
        <line x1="15" y1="50" x2="22" y2="50"/>
        <line x1="78" y1="30" x2="85" y2="30"/>
        <line x1="75" y1="40" x2="85" y2="40"/>
        <line x1="78" y1="50" x2="85" y2="50"/>
      </g>
    </svg>
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
