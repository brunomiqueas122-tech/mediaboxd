"use client";

import { useState } from "react";

const STAR_COUNT = 5;

// Each star is worth 2 rating points (0-10 scale). Clicking/hovering the left
// half of a star picks the half-point value, the right half the full point —
// determined from cursor position rather than split buttons, which is more
// reliable across browsers and works for touch taps too.
const SIZE_CLASSES = {
  md: "w-8 h-8 text-3xl",
  sm: "w-4 h-4 text-base",
};

export function StarRating({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  disabled?: boolean;
  size?: "md" | "sm";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? (value === "" ? 0 : value);

  function valueFromPointer(e: React.MouseEvent<HTMLDivElement>, starIndex: number): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    return starIndex * 2 + (isLeftHalf ? 1 : 2);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: STAR_COUNT }).map((_, i) => {
          const fullValue = i * 2 + 2;
          const halfValue = i * 2 + 1;
          const fillPercent = display >= fullValue ? 100 : display >= halfValue ? 50 : 0;

          return (
            <div
              key={i}
              className={`relative leading-none select-none ${SIZE_CLASSES[size]} ${disabled ? "" : "cursor-pointer"}`}
              onMouseMove={disabled ? undefined : (e) => setHover(valueFromPointer(e, i))}
              onClick={disabled ? undefined : (e) => onChange(valueFromPointer(e, i))}
            >
              <span className="absolute inset-0 text-neutral-700">★</span>
              <span
                className="absolute inset-0 text-orange-400 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                ★
              </span>
            </div>
          );
        })}
      </div>
      {value !== "" && (
        <span className="text-xs text-neutral-500 flex items-center gap-1.5">
          {value / 2}/5
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="hover:text-red-400"
              aria-label="Limpar nota"
            >
              ×
            </button>
          )}
        </span>
      )}
    </div>
  );
}
