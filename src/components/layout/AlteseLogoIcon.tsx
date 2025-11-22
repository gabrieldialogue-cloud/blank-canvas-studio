export function AlteseLogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle com gradiente */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#003C8F" />
          <stop offset="50%" stopColor="#1A73E8" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#003C8F" />
        </linearGradient>
      </defs>
      
      {/* Círculo externo */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
      
      {/* Letra A estilizada moderna */}
      <path
        d="M 35 70 L 45 30 L 55 30 L 65 70 M 40 55 L 60 55"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Detalhe de tecnologia - linhas de conexão */}
      <circle cx="30" cy="50" r="3" fill="url(#innerGradient)" opacity="0.8" />
      <circle cx="70" cy="50" r="3" fill="url(#innerGradient)" opacity="0.8" />
      <circle cx="50" cy="25" r="3" fill="url(#innerGradient)" opacity="0.8" />
      
      {/* Linhas conectando os pontos */}
      <line x1="30" y1="50" x2="45" y2="40" stroke="white" strokeWidth="1" opacity="0.4" />
      <line x1="70" y1="50" x2="55" y2="40" stroke="white" strokeWidth="1" opacity="0.4" />
      <line x1="50" y1="25" x2="50" y2="35" stroke="white" strokeWidth="1" opacity="0.4" />
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
