import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});

// --- jsdom polyfills -------------------------------------------------------

/** Fire immediately with a fixed size so ResponsiveContainer renders charts. */
class ImmediateResizeObserver implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = {
      target,
      contentRect: {
        x: 0,
        y: 0,
        width: 800,
        height: 320,
        top: 0,
        right: 800,
        bottom: 320,
        left: 0,
        toJSON: () => ({}),
      },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as unknown as ResizeObserverEntry;
    // React batches state updates; run outside the act() window safely.
    queueMicrotask(() => this.callback([entry], this));
  }

  unobserve(): void {}
  disconnect(): void {}
}

window.ResizeObserver = ImmediateResizeObserver as unknown as typeof ResizeObserver;

// jsdom has no layout: recharts measures text via getBBox.
if (typeof SVGElement !== "undefined") {
  const proto = SVGElement.prototype as unknown as Record<string, unknown>;
  proto.getBBox = () =>
    ({ x: 0, y: 0, width: 80, height: 16, top: 0, right: 80, bottom: 16, left: 0 }) as DOMRect;
  proto.getComputedTextLength = () => 80;
}

window.matchMedia =
  window.matchMedia ??
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList);

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? vi.fn();
window.scrollTo = window.scrollTo ?? (vi.fn() as typeof window.scrollTo);
