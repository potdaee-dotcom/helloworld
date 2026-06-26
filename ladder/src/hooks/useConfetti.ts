"use client";

import { useCallback } from "react";

export function useConfetti() {
  const fire = useCallback(async () => {
    const confetti = (await import("canvas-confetti")).default;
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function burst(particleRatio: number, opts: Record<string, unknown>) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    burst(0.25, { spread: 26, startVelocity: 55 });
    burst(0.2, { spread: 60 });
    burst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    burst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    burst(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  return { fire };
}
