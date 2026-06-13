'use client';

import type { PackagePopularityItem } from '@/lib/types';

interface Props {
  items: PackagePopularityItem[];
}

export default function PackagePopularityCard({ items }: Props) {
  const hasData = items.length > 0 && items.some((i) => i.purchaseCount > 0);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-100">
      <h3 className="font-extrabold text-base text-brand mb-3.5">
        📦 Popularitas Paket
      </h3>

      {!hasData ? (
        <p className="text-gray-400 text-sm text-center py-4">
          Belum ada data popularitas paket
        </p>
      ) : (
        <div>
          {items.map((item) => (
            <div
              key={item.packageId}
              className="flex justify-between items-center gap-2 py-2.5 border-b border-gray-100 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-gray-800 truncate">
                  {item.packageName}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(item.purchaseShare, 1)}%`,
                        backgroundColor: '#2563EB',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <span className="text-xs font-extrabold min-w-[2.5rem] text-right tabular-nums">
                  {item.purchaseShare}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
