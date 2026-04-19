'use client';

import type { LogoConfig } from '@/lib/types';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  cfg?: Partial<LogoConfig>;
  className?: string;
}

export default function Logo({ size = 'md', cfg = {}, className = '' }: LogoProps) {
  const dims = { sm: [32, 13, 9], md: [44, 18, 11], lg: [58, 24, 13] }[size];
  const gap = size === 'sm' ? 8 : 12;
  
  const nama = cfg.namaApp || 'FIX ASN';
  const tag = cfg.tagline || 'Sukses Lolos CPNS';
  const cNama = cfg.warnaNama || '#1B3A6B';
  const cTag = cfg.warnaTag || '#9A7000';
  const cKiri = cfg.warnaKiri || '#F5C518';
  const cKanan = cfg.warnaKanan || '#1B3A6B';
  const cInner = cfg.warnaInner || '#1B3A6B';
  const imgSrc = cfg.customImg || null;
  
  const w = dims[0];
  const h = Math.round(dims[0] * 1.1);

  return (
    <div className={`flex items-center ${className}`} style={{ gap }}>
      {imgSrc ? (
        <img 
          src={imgSrc} 
          alt="logo" 
          style={{ width: w, height: h, objectFit: 'contain' }}
          className="flex-shrink-0"
        />
      ) : (
        <svg 
          width={w} 
          height={h} 
          viewBox="0 0 100 112" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <path d="M50 6L10 22V58C10 82 50 106 50 106V6Z" fill={cKiri} />
          <path d="M50 6L90 22V58C90 82 50 106 50 106V6Z" fill={cKanan} />
          <path d="M50 20L28 30V54C28 67 50 80 50 80V20Z" fill={cInner} />
          <polyline 
            points="32,58 44,72 70,42" 
            stroke="white" 
            strokeWidth="9" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
          <path d="M50 6V106" stroke="white" strokeWidth="1.5" opacity="0.3" />
        </svg>
      )}
      <div className="flex flex-col">
        <div 
          className="font-black leading-tight -tracking-wide"
          style={{ 
            fontFamily: "'Montserrat', sans-serif", 
            fontWeight: 900, 
            fontSize: dims[1], 
            color: cNama 
          }}
        >
          {nama}
        </div>
        <div 
          className="font-bold leading-snug"
          style={{ 
            fontFamily: "'Montserrat', sans-serif", 
            fontWeight: 700, 
            fontSize: dims[2], 
            color: cTag 
          }}
        >
          {tag}
        </div>
      </div>
    </div>
  );
}
