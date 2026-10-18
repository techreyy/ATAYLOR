import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

const SIZES = {
  xs: { box: "w-8 h-8", px: 32 },
  sm: { box: "w-10 h-10", px: 40 },
  md: { box: "w-10 h-10", px: 36 },
  lg: { box: "w-12 h-12", px: 44 },
  xl: { box: "w-16 h-16", px: 56 },
};

export function BrandLogo({ size = "sm", className = "", priority = false }: BrandLogoProps) {
  const s = SIZES[size] || SIZES.sm;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${s.box} ${className}`}
    >
      <Image
        src="/logo-light.png"
        alt="A-Taylor Kendari Logo"
        width={s.px}
        height={s.px}
        priority={priority}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default BrandLogo;
