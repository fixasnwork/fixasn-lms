'use client';

import { useState } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', style = {}, hover = false, onClick }: CardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-6 border border-gray-100
        transition-all duration-250
        ${isHovered ? 'shadow-xl -translate-y-1' : 'shadow-md'}
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
}
