'use client';

import Image from 'next/image';
import type { LogoConfig } from '@/lib/types';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  cfg?: Partial<LogoConfig>;
  className?: string;
}

export default function Logo({ size = 'md', cfg = {}, className = '' }: LogoProps) {
  const imgH = { sm: 28, md: 38, lg: 50 }[size];

  // Use custom image if provided, otherwise default to logo_with_text.png
  const imgSrc = (cfg.customImg && cfg.customImg.length > 0) ? cfg.customImg : '/logo_with_text.png';

  return (
    <div className={`flex items-center ${className}`}>
      <Image 
        src={imgSrc} 
        alt="FIX ASN" 
        width={imgH * 4}
        height={imgH}
        style={{ objectFit: 'contain', height: imgH, width: 'auto' }}
        className="flex-shrink-0"
      />
    </div>
  );
}
