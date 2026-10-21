import { useEffect, useRef, useState } from "react";

/**
 * Angka berhitung naik dari 0 ke `target` sekali, saat nilai pertama tersedia.
 * Perubahan berikutnya langsung ditampilkan; animasi dilewati bila pengguna memilih kurangi gerakan.
 */
export function useCountUp(target: number | null, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (target === null) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animated.current || reduceMotion || target === 0) {
      animated.current = true;
      setValue(target);
      return;
    }
    animated.current = true;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setValue(target);
    };
  }, [target, durationMs]);

  return value;
}
