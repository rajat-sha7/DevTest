// src/components/DocSlider.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface DocSliderProps {
  images: string[];
}

export default function DocSlider({ images }: DocSliderProps) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!images || images.length === 0) return null;

  const prev = () => setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-8 h-8 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
        aria-label="Next image"
      >
        <ChevronRight className="w-8 h-8 text-white" />
      </button>

      {/* Image container */}
      <div
        className={"relative w-full h-full flex items-center justify-center cursor-pointer " + (zoomed ? "scale-150" : "scale-100")}
        onClick={() => setZoomed((z) => !z)}
        style={{ transition: "transform 0.3s ease" }}
      >
        <Image
          src={images[index]}
          alt={`Document ${index + 1}`}
          fill
          style={{ objectFit: "contain" }}
          className="max-w-full max-h-full"
          priority
        />
      </div>
    </div>
  );
}
