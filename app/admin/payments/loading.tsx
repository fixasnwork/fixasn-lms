export default function AdminPaymentsLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="h-8 w-56 bg-gray-200 rounded-lg animate-pulse mb-5.5" />
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
