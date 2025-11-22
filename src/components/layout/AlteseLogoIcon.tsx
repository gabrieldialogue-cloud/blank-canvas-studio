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
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* Forma geométrica principal - Diamante moderno */}
      <path
        d="M 50 8 L 85 30 L 85 70 L 50 92 L 15 70 L 15 30 Z"
        fill="url(#blueGradient)"
        filter="url(#shadow)"
      />
      
      {/* Elemento central - Símbolo de velocidade/automação */}
      <g transform="translate(50, 50)">
        {/* Seta estilizada para a direita - representa progresso e automação */}
        <path
          d="M -15 -12 L 8 0 L -15 12 L -10 0 Z"
          fill="white"
          opacity="0.95"
        />
        <path
          d="M -8 -8 L 15 0 L -8 8 L -3 0 Z"
          fill="url(#orangeGradient)"
          opacity="0.9"
        />
      </g>
      
      {/* Elementos de inovação - Pontos orbitando */}
      <g>
        {/* Órbita superior */}
        <circle cx="50" cy="20" r="2.5" fill="url(#orangeGradient)" opacity="0.9">
          <animate
            attributeName="opacity"
            values="0.9;0.3;0.9"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Órbita lateral esquerda */}
        <circle cx="22" cy="40" r="2.5" fill="url(#greenGradient)" opacity="0.8">
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Órbita lateral direita */}
        <circle cx="78" cy="40" r="2.5" fill="url(#greenGradient)" opacity="0.8">
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Órbita inferior esquerda */}
        <circle cx="30" cy="75" r="2.5" fill="url(#orangeGradient)" opacity="0.7">
          <animate
            attributeName="opacity"
            values="0.7;0.3;0.7"
            dur="2s"
            begin="0.9s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Órbita inferior direita */}
        <circle cx="70" cy="75" r="2.5" fill="url(#orangeGradient)" opacity="0.7">
          <animate
            attributeName="opacity"
            values="0.7;0.3;0.7"
            dur="2s"
            begin="1.2s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      
      {/* Linhas de conexão - Rede neural/IA */}
      <g stroke="white" strokeWidth="0.8" opacity="0.15">
        <line x1="50" y1="20" x2="50" y2="35" />
        <line x1="22" y1="40" x2="35" y2="45" />
        <line x1="78" y1="40" x2="65" y2="45" />
        <line x1="30" y1="75" x2="40" y2="60" />
        <line x1="70" y1="75" x2="60" y2="60" />
      </g>
      
      {/* Bordas decorativas do diamante */}
      <path
        d="M 50 8 L 85 30 L 85 70 L 50 92 L 15 70 L 15 30 Z"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        opacity="0.2"
      />
      
      {/* Detalhes internos - cantos */}
      <g opacity="0.3">
        <circle cx="50" cy="15" r="1.5" fill="white" />
        <circle cx="20" cy="35" r="1.5" fill="white" />
        <circle cx="80" cy="35" r="1.5" fill="white" />
        <circle cx="20" cy="65" r="1.5" fill="white" />
        <circle cx="80" cy="65" r="1.5" fill="white" />
        <circle cx="50" cy="85" r="1.5" fill="white" />
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
