import { Component, Input } from '@angular/core';

export type HpIconName =
  | 'alert'
  | 'bell'
  | 'bike'
  | 'cash'
  | 'check'
  | 'circle'
  | 'clipboard'
  | 'clock'
  | 'dashboard'
  | 'flame'
  | 'folder'
  | 'map-pin'
  | 'package'
  | 'payment'
  | 'phone'
  | 'refresh'
  | 'settings'
  | 'star'
  | 'user'
  | 'utensils'
  | 'wallet'
  | 'x';

@Component({
  selector: 'app-hp-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true">
      @switch (name) {
        @case ('alert') {
          <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        }
        @case ('bell') {
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
        }
        @case ('bike') {
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <path d="M15 6h3l2 3M5.5 17.5 9 10h5l4.5 7.5M9 10l-2-3H4m5 3 3 7.5"/>
        }
        @case ('cash') {
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M6 9H5a1 1 0 0 0-1 1v1m14-2h1a1 1 0 0 1 1 1v1M6 15H5a1 1 0 0 1-1-1v-1m14 2h1a1 1 0 0 0 1-1v-1"/>
        }
        @case ('check') {
          <polyline points="20 6 9 17 4 12"/>
        }
        @case ('circle') {
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
        }
        @case ('clipboard') {
          <rect x="5" y="4" width="14" height="17" rx="2"/>
          <path d="M9 4V2h6v2M9 10h6m-6 4h6m-6 4h4"/>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9"/>
          <polyline points="12 7 12 12 15 14"/>
        }
        @case ('dashboard') {
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        }
        @case ('flame') {
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>
        }
        @case ('folder') {
          <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
        }
        @case ('map-pin') {
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>
          <circle cx="12" cy="10" r="2.5"/>
        }
        @case ('package') {
          <path d="m21 8-9-5-9 5 9 5 9-5Z"/>
          <path d="m3 8 9 5v9l9-5V8M12 13v9"/>
        }
        @case ('payment') {
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
          <line x1="6" y1="15" x2="10" y2="15"/>
        }
        @case ('phone') {
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z"/>
        }
        @case ('refresh') {
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>
        }
        @case ('star') {
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>
        }
        @case ('user') {
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        }
        @case ('utensils') {
          <path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7"/>
        }
        @case ('wallet') {
          <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/>
          <path d="M16 13h4"/>
        }
        @case ('x') {
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      line-height: 0;
    }

    svg {
      display: block;
    }
  `]
})
export class HpIconComponent {
  @Input({ required: true }) name!: HpIconName;
  @Input() size: number | string = 18;
}
