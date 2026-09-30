import { Injectable } from '@angular/core';

/** Full-screen overlays register here so the Android back button closes them before navigating. */
@Injectable({ providedIn: 'root' })
export class BackHandlerService {
  private readonly handlers: Array<() => void> = [];

  push(handler: () => void) {
    this.handlers.push(handler);
  }

  remove(handler: () => void) {
    const index = this.handlers.lastIndexOf(handler);
    if (index >= 0) this.handlers.splice(index, 1);
  }

  /** Runs the most recently opened overlay's close handler. Returns false when none is open. */
  handle(): boolean {
    const handler = this.handlers.pop();
    if (!handler) return false;
    handler();
    return true;
  }
}
