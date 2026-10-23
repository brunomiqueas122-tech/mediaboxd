export default function Loading() {
  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-8">
      <div>
        <div className="aspect-[2/3] rounded-md bg-neutral-800 animate-pulse" />
        <div className="h-32 mt-4 bg-neutral-800 rounded-md animate-pulse" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-8 w-2/3 bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-neutral-800 rounded animate-pulse" />
        <div className="h-24 w-full bg-neutral-800 rounded animate-pulse mt-4" />
      </div>
    </div>
  );
}
