import { Injectable, NgZone, inject } from '@angular/core';

/** Fraction of the remaining distance covered per 60fps frame. */
const WHEEL_EASE = 0.11;
/** Wheel notches move less than the browser default so pages travel slower. */
const WHEEL_STEP = 0.72;
/** Flick momentum kept after the finger lifts. */
const FLING_SCALE = 0.62;
/** Velocity retained per 60fps frame while a flick decays. */
const FLING_DECAY = 0.93;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_RATIO = 0.9;
const FRAME_MS = 1000 / 60;
/** Below this the gesture is still ambiguous between a tap, swipe and scroll. */
const GESTURE_THRESHOLD_PX = 6;

@Injectable({ providedIn: 'root' })
export class SmoothScrollService {
  private readonly zone = inject(NgZone);

  private started = false;
  private target = 0;
  private animating = false;
  private lastFrameAt = 0;

  private touchY = 0;
  private touchX = 0;
  private touchAt = 0;
  private velocity = 0;
  private gesture: 'undecided' | 'vertical' | 'native' = 'native';

  start() {
    if (this.started || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.started = true;

    this.zone.runOutsideAngular(() => {
      window.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('touchstart', this.onTouchStart, { passive: true });
      window.addEventListener('touchmove', this.onTouchMove, { passive: false });
      window.addEventListener('touchend', this.onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', this.stopAnimation, { passive: true });
    });
  }

  private onWheel = (event: WheelEvent) => {
    // Ctrl+wheel is a browser zoom gesture, never a scroll.
    if (event.ctrlKey || event.defaultPrevented) return;
    if (!this.canDrive(event.target)) return;

    const delta = this.pixelDelta(event);
    const maxScroll = this.maxScroll();
    if (!delta || maxScroll <= 0) return;

    event.preventDefault();
    const from = this.animating ? this.target : window.scrollY;
    this.target = this.clamp(from + delta * WHEEL_STEP, maxScroll);
    this.runAnimation(this.wheelFrame);
  };

  private onTouchStart = (event: TouchEvent) => {
    this.stopAnimation();
    const touch = event.touches[0];
    if (!touch) return;

    this.touchY = touch.clientY;
    this.touchX = touch.clientX;
    this.touchAt = event.timeStamp;
    this.velocity = 0;
    this.gesture = this.canDrive(event.target) ? 'undecided' : 'native';
  };

  private onTouchMove = (event: TouchEvent) => {
    if (this.gesture === 'native' || event.defaultPrevented) return;
    const touch = event.touches[0];
    if (!touch) return;

    const dy = this.touchY - touch.clientY;
    const dx = this.touchX - touch.clientX;

    if (this.gesture === 'undecided') {
      if (Math.abs(dy) < GESTURE_THRESHOLD_PX && Math.abs(dx) < GESTURE_THRESHOLD_PX) return;
      // Horizontal swipes belong to carousels and sliders, so hand them back.
      this.gesture = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'native';
      if (this.gesture === 'native') return;
    }

    const maxScroll = this.maxScroll();
    const overscrollsTop = window.scrollY <= 0 && dy < 0;
    const overscrollsBottom = window.scrollY >= maxScroll - 1 && dy > 0;
    // Pull-to-refresh and edge rubber-banding stay with the browser.
    if (maxScroll <= 0 || overscrollsTop || overscrollsBottom) {
      this.gesture = 'native';
      return;
    }

    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - this.touchAt);
    // Exponential average keeps a single jittery frame from defining the flick.
    this.velocity = this.velocity * 0.7 + (dy / elapsed) * FRAME_MS * 0.3;
    this.touchY = touch.clientY;
    this.touchX = touch.clientX;
    this.touchAt = event.timeStamp;

    // Dragging stays pinned to the finger; only the release is eased.
    this.scrollTo(this.clamp(window.scrollY + dy, maxScroll));
  };

  private onTouchEnd = () => {
    if (this.gesture !== 'vertical') return;
    this.gesture = 'native';

    const maxScroll = this.maxScroll();
    if (maxScroll <= 0 || Math.abs(this.velocity) < 0.4) return;

    this.velocity *= FLING_SCALE;
    this.runAnimation(this.flingFrame);
  };

  private wheelFrame = (now: number) => {
    const frames = this.frameDelta(now);
    const current = window.scrollY;
    const distance = this.target - current;

    if (Math.abs(distance) < 0.5) {
      this.scrollTo(this.target);
      this.animating = false;
      return;
    }

    const eased = 1 - Math.pow(1 - WHEEL_EASE, frames);
    this.scrollTo(current + distance * eased);
    requestAnimationFrame(this.wheelFrame);
  };

  private flingFrame = (now: number) => {
    const frames = this.frameDelta(now);
    const maxScroll = this.maxScroll();
    const next = this.clamp(window.scrollY + this.velocity * frames, maxScroll);

    this.velocity *= Math.pow(FLING_DECAY, frames);
    this.scrollTo(next);

    if (Math.abs(this.velocity) < 0.15 || next <= 0 || next >= maxScroll) {
      this.animating = false;
      return;
    }
    requestAnimationFrame(this.flingFrame);
  };

  private runAnimation(frame: FrameRequestCallback) {
    this.lastFrameAt = 0;
    if (this.animating) return;
    this.animating = true;
    requestAnimationFrame(frame);
  }

  private stopAnimation = () => {
    this.animating = false;
    this.velocity = 0;
  };

  private frameDelta(now: number): number {
    const previous = this.lastFrameAt || now - FRAME_MS;
    this.lastFrameAt = now;
    // Clamping keeps a backgrounded tab from resuming with one huge jump.
    return Math.min(4, Math.max(0.2, (now - previous) / FRAME_MS));
  }

  /**
   * Page-level scrolling is only driven when nothing closer to the pointer can
   * scroll itself — modals, sidebars, maps and text fields keep native handling.
   */
  private canDrive(eventTarget: EventTarget | null): boolean {
    if (document.body.style.overflow === 'hidden') return false;

    let node = eventTarget instanceof Element ? eventTarget : null;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.closest('input, textarea, select, [contenteditable="true"], .gm-style')) {
        return false;
      }
      const style = getComputedStyle(node);
      const scrollable = /auto|scroll|overlay/.test(style.overflowY);
      if (scrollable && node.scrollHeight > node.clientHeight + 1) return false;
      node = node.parentElement;
    }
    return true;
  }

  private pixelDelta(event: WheelEvent): number {
    if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT_PX;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight * PAGE_HEIGHT_RATIO;
    return event.deltaY;
  }

  private maxScroll(): number {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  private clamp(value: number, maxScroll: number): number {
    return Math.min(maxScroll, Math.max(0, value));
  }

  /** `html { scroll-behavior: smooth }` would re-animate every frame we set. */
  private scrollTo(top: number) {
    window.scrollTo({ top, behavior: 'auto' });
  }
}
