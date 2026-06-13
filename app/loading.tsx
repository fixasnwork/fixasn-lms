export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-brand-secondary opacity-70 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-gray-400 font-medium">Memuat...</p>
      </div>
    </div>
  );
}
