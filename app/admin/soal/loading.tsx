export default function AdminSoalLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-5.5" />
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
