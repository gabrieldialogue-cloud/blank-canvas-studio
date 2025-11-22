export function AlteseLogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#003C8F" />
          <stop offset="50%" stopColor="#1A73E8" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="accentOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FF5722" />
        </linearGradient>
        <linearGradient id="accentGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#00C853" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Círculo base com gradiente */}
      <circle cx="60" cy="60" r="55" fill="url(#mainGradient)" opacity="0.95" />
      
      {/* Anel externo decorativo */}
      <circle 
        cx="60" 
        cy="60" 
        r="52" 
        fill="none" 
        stroke="white" 
        strokeWidth="1.5" 
        opacity="0.15"
        strokeDasharray="8 4"
      />
      
      {/* Letra A estilizada moderna */}
      <path
        d="M 60 25 L 80 75 L 70 75 L 67 65 L 53 65 L 50 75 L 40 75 Z M 56 56 L 64 56 L 60 38 Z"
        fill="white"
        filter="url(#glow)"
      />
      
      {/* Elementos de conexão - representando IA e automação */}
      <g opacity="0.9">
        {/* Nós superiores */}
        <circle cx="40" cy="35" r="3.5" fill="url(#accentOrange)" />
        <circle cx="80" cy="35" r="3.5" fill="url(#accentOrange)" />
        
        {/* Nós laterais */}
        <circle cx="25" cy="60" r="3.5" fill="url(#accentGreen)" />
        <circle cx="95" cy="60" r="3.5" fill="url(#accentGreen)" />
        
        {/* Nós inferiores */}
        <circle cx="45" cy="85" r="3.5" fill="url(#accentOrange)" />
        <circle cx="75" cy="85" r="3.5" fill="url(#accentOrange)" />
      </g>
      
      {/* Linhas de conexão entre nós - representando fluxo de dados */}
      <g stroke="white" strokeWidth="1.2" opacity="0.25">
        <line x1="40" y1="35" x2="56" y2="38" />
        <line x1="80" y1="35" x2="64" y2="38" />
        <line x1="25" y1="60" x2="50" y2="75" />
        <line x1="95" y1="60" x2="70" y2="75" />
        <line x1="45" y1="85" x2="53" y2="65" />
        <line x1="75" y1="85" x2="67" y2="65" />
      </g>
      
      {/* Efeito de brilho interno */}
      <circle 
        cx="60" 
        cy="60" 
        r="55" 
        fill="none" 
        stroke="white" 
        strokeWidth="2" 
        opacity="0.1"
      />
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
