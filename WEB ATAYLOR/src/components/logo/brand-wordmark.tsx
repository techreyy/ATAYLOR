import React from "react";
import Image from "next/image";

// Tulisan "A-TAYLOR / SINCE 2020" (versi latar terang, rasio ±3,86 : 1)
const RATIO = 773 / 200;

interface BrandWordmarkProps {
  height?: number;
  className?: string;
  priority?: boolean;
}

export function BrandWordmark({ height = 36, className = "", priority = false }: BrandWordmarkProps) {
  return (
    <Image
      src="/logo-text.png"
      alt="A-Taylor — Since 2020"
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}

export default BrandWordmark;
