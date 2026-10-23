export default function Loading() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-neutral-800 animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mb-8">
          <div className="h-5 w-24 bg-neutral-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="aspect-[2/3] bg-neutral-800 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
