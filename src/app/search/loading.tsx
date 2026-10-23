export default function Loading() {
  return (
    <div>
      <div className="h-8 w-32 bg-neutral-800 rounded animate-pulse mb-4" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-neutral-800 rounded-md animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-neutral-800 rounded-md animate-pulse" />
        ))}
      </div>
    </div>
  );
}
