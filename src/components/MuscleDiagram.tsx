import React from 'react';

interface MuscleDiagramProps {
  category: string;
  className?: string;
}

export const MuscleDiagram: React.FC<MuscleDiagramProps> = ({ category, className = "" }) => {
  // Cores do diagrama
  const baseColor = "#E5E7EB"; // Cinza claro (músculo inativo)
  const activeColor = "#EF4444"; // Vermelho (músculo alvo)
  const strokeColor = "#374151"; // Cinza escuro (contorno)

  // Lógica de destaque por categoria
  const isHighlighted = (muscleGroups: string[]) => 
    muscleGroups.includes(category) ? activeColor : baseColor;

  return (
    <div className={`relative flex items-center justify-center bg-white rounded-lg p-2 ${className}`}>
      <svg
        viewBox="0 0 100 120"
        className="w-full h-full max-h-[160px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cabeça */}
        <circle cx="50" cy="15" r="8" fill={baseColor} stroke={strokeColor} strokeWidth="1" />
        
        {/* Tronco / Peito */}
        <path
          d="M35 25 L65 25 L68 55 L32 55 Z"
          fill={isHighlighted(['Peito', 'Core'])}
          stroke={strokeColor}
          strokeWidth="1"
        />
        
        {/* Ombros */}
        <circle cx="32" cy="28" r="5" fill={isHighlighted(['Ombros'])} stroke={strokeColor} strokeWidth="1" />
        <circle cx="68" cy="28" r="5" fill={isHighlighted(['Ombros'])} stroke={strokeColor} strokeWidth="1" />
        
        {/* Braços (Bíceps/Tríceps) */}
        <path
          d="M27 30 L22 55"
          stroke={isHighlighted(['Bíceps', 'Tríceps'])}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M73 30 L78 55"
          stroke={isHighlighted(['Bíceps', 'Tríceps'])}
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Antebraços */}
        <path d="M22 55 L18 75" stroke={baseColor} strokeWidth="4" strokeLinecap="round" />
        <path d="M78 55 L82 75" stroke={baseColor} strokeWidth="4" strokeLinecap="round" />

        {/* Pernas (Quadríceps/Posterior) */}
        <path
          d="M35 55 L32 85 L35 110"
          fill="none"
          stroke={isHighlighted(['Pernas'])}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M65 55 L68 85 L65 110"
          fill="none"
          stroke={isHighlighted(['Pernas'])}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Detalhe do Peito (Linha divisória) */}
        {category === 'Peito' && (
          <path d="M50 25 L50 55" stroke={strokeColor} strokeWidth="0.5" opacity="0.5" />
        )}
      </svg>
      
      {/* Legenda flutuante discreta */}
      <div className="absolute bottom-1 right-1 text-[8px] font-bold uppercase tracking-tighter text-gray-400">
        Diagrama Técnico
      </div>
    </div>
  );
};
