"use client";

import { useEffect, useRef, useState } from "react";

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="md:hidden" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="text-neutral-300 hover:text-white p-1 -mr-1"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) setOpen(false);
          }}
          className="absolute left-0 right-0 top-full bg-neutral-950 border-b border-neutral-800 px-4 py-4 flex flex-col gap-4 z-20 max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          {children}
        </div>
      )}
    </div>
  );
}
