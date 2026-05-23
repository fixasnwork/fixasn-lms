'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [inputUrl, setInputUrl] = useState(value || '');

  const handleUrlSubmit = () => {
    setError('');
    onChange(inputUrl.trim());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      setInputUrl(data.url);
      onChange(data.url);
    } catch {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-bold text-gray-500">{label}</label>
      )}
      {value ? (
        <div className="relative h-28">
          <Image
            src={value}
            alt="preview"
            fill
            unoptimized
            sizes="100vw"
            className="rounded-lg border border-gray-200 object-contain bg-white"
          />
          <button
            type="button"
            onClick={() => { onChange(''); setInputUrl(''); setError(''); }}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste URL gambar di sini..."
              className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-bold cursor-pointer sm:w-auto w-full"
            >
              Use URL
            </button>
          </div>
          <div className="text-center text-xs text-gray-400">atau</div>
          <div className="mt-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 disabled:opacity-50"
            />
            {uploading && (
              <span className="ml-2 text-xs text-blue-500">Mengupload...</span>
            )}
          </div>
          {error && (
            <div className="mt-2 text-xs text-red-500 font-bold">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
