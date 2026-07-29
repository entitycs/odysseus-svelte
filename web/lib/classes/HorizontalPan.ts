export class HorizontalPan {
  box: HTMLElement;
  inner: HTMLElement;
  raf: number | null = null;
  pos = 0;
  dir = 1;
  speed: number;
  mode: "bounce" | "loop";
  pause: number;
  paused = false;
  active = false;

  constructor(box: HTMLElement, inner: HTMLElement, opts?: {
    speed?: number;
    mode?: "bounce" | "loop";
    pause?: number;
  }) {
    this.box = box;
    this.inner = inner;
    this.speed = opts?.speed ?? 1;
    this.mode = opts?.mode ?? "bounce";
    this.pause = opts?.pause ?? 600; // default: 0.6s pause
    this.speed /= 4; // let actual speed be lower than conceptual speed
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.paused = false;
    this.raf = requestAnimationFrame(() => this.tick());
  }

  stop() {
    this.active = false;
    this.paused = false;

    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;

    this.pos = 0;
    this.dir = 1;
    this.inner.style.transform = "translateX(0)";
  }

  async pauseAtEdge() {
    this.paused = true;

    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;

    await new Promise(r => setTimeout(r, this.pause));

    // If user left during pause, do NOT restart
    if (!this.active) return;

    this.paused = false;
    this.start();
  }

  tick() {
    if (!this.active) return;

    const max = this.inner.scrollWidth - this.box.clientWidth;
    if (max <= 0) return;

    this.pos += this.dir * Math.min(this.speed * 2, this.speed + max * 0.01);// wider == faster

    if (this.mode === "bounce") {
      if (this.pos >= max) {
        this.pos = max;
        this.dir = -1;
        this.inner.style.transform = `translateX(${-this.pos}px)`;
        this.pauseAtEdge();
        return;
      }
      if (this.pos <= 0) {
        this.pos = 0;
        this.dir = 1;
        this.inner.style.transform = `translateX(0)`;
        this.pauseAtEdge();
        return;
      }
    }

    if (this.mode === "loop") {
      if (this.pos >= max) this.pos = 0;
    }

    this.inner.style.transform = `translateX(${-this.pos}px)`;
    this.raf = requestAnimationFrame(() => this.tick());
  }
}
