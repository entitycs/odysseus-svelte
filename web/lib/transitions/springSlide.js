// springSlide.js
import { cubicOut } from 'svelte/easing';

export function springSlide(node, { delay = 0, duration = 450, overshoot = 20 } = {}) {
    const style = getComputedStyle(node);
    const width = parseFloat(style.width);

    return {
        delay,
        duration,
        css: (t) => {
            // t = 0 → 1
            // We want:
            //   0: translateX(width + 40px)
            //   0.8: translateX(-overshoot)
            //   1: translateX(0)

            // Phase split:
            //   first 80% = slide in
            //   last 20% = spring settle

            let x;

            if (t < 0.8) {
                // slide from right → slightly left
                const p = t / 0.8;
                x = (1 - p) * (width + 40) - p * overshoot;
            } else {
                // settle from overshoot → final
                const p = (t - 0.8) / 0.2;
                x = -overshoot * (1 - cubicOut(p));
            }

            return `transform: translateX(${x}px); opacity: ${t}`;
        }
    };
}
