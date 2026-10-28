import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Bộ icon nét SVG 24×24, nét 1,75, màu theo currentColor — không dùng thư viện ngoài
 * để app chạy được khi không có mạng.
 */
export type IconName =
  | 'home'
  | 'sell'
  | 'buy'
  | 'box'
  | 'wallet'
  | 'handshake'
  | 'chart'
  | 'list'
  | 'trash'
  | 'users'
  | 'settings'
  | 'upload'
  | 'menu'
  | 'logout'
  | 'key'
  | 'plus'
  | 'search'
  | 'x'
  | 'check'
  | 'alert'
  | 'refresh'
  | 'file'
  | 'download'
  | 'print'
  | 'back'
  | 'chevron'
  | 'clock'
  | 'truck'
  | 'bank'
  | 'swap'
  | 'import'
  | 'eye'
  | 'edit'
  | 'lock'
  | 'contact'
  | 'bell';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="ico" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @switch (name()) {
        @case ('home') { <path d="M3.2 10.6 12 3.4l8.8 7.2" /><path d="M5.4 9.4v11.2h13.2V9.4" /><path d="M9.6 20.6v-6h4.8v6" /> }
        @case ('sell') { <path d="M6 3.5h9l3.5 3.5v13.5H6z" /><path d="M15 3.5V7h3.5" /><path d="M9 11.5h6M9 15h6M9 18h3.5" /> }
        @case ('buy') { <circle cx="9" cy="20" r="1.4" /><circle cx="17.5" cy="20" r="1.4" /><path d="M2.8 3.6h2.6l2.4 11.6h10.6l2-8H6.4" /> }
        @case ('box') { <path d="M12 2.8 20.6 7.4v9.2L12 21.2 3.4 16.6V7.4z" /><path d="M3.6 7.5 12 12l8.4-4.5M12 12v9" /> }
        @case ('wallet') { <rect x="2.8" y="5.6" width="18.4" height="14.2" rx="2.2" /><path d="M2.8 9.6h18.4" /><path d="M16.2 14.4h2" /> }
        @case ('handshake') { <path d="m11 17.6 1.6 1.6a1.6 1.6 0 0 0 2.3-2.3" /><path d="m13.4 15.2 2.2 2.2a1.6 1.6 0 0 0 2.3-2.3l-3.6-3.6-2 2a1.7 1.7 0 0 1-2.4-2.4l3-3a3 3 0 0 1 3.4-.5l3.4 1.6" /><path d="m2.4 10.4 4.6-4.6 3.2 1.4" /><path d="M5 12.6 9.8 17.4a1.6 1.6 0 0 0 2.3-2.3" /> }
        @case ('chart') { <path d="M4 20.4V13m5 7.4V8.6m5 11.8v-9m5 9V4.6" /><path d="M2.6 20.4h18.8" /> }
        @case ('contact') { <rect x="4" y="2.8" width="15.6" height="18.4" rx="2.2" /><circle cx="11.8" cy="10" r="2.8" /><path d="M7.4 17.4c.6-2.3 2.3-3.6 4.4-3.6s3.8 1.3 4.4 3.6" /><path d="M2.6 7.4h2.8M2.6 12h2.8M2.6 16.6h2.8" /> }
        @case ('list') { <path d="M8.6 6.4h12M8.6 12h12M8.6 17.6h12" /><path d="M3.6 6.4h.01M3.6 12h.01M3.6 17.6h.01" /> }
        @case ('trash') { <path d="M4 6.6h16M9.4 6.6V4.2h5.2v2.4" /><path d="M6 6.6l.9 13.2a1.6 1.6 0 0 0 1.6 1.4h7a1.6 1.6 0 0 0 1.6-1.4L18 6.6" /><path d="M10 10.6v6.4M14 10.6v6.4" /> }
        @case ('users') { <circle cx="9.2" cy="8" r="3.4" /><path d="M2.8 20.6c0-3.6 2.9-5.8 6.4-5.8s6.4 2.2 6.4 5.8" /><path d="M16.8 5.2a3.4 3.4 0 0 1 0 6.4" /><path d="M18.6 15.4c1.8.8 2.8 2.5 2.8 5.2" /> }
        @case ('settings') { <circle cx="12" cy="12" r="3" /><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /> }
        @case ('upload') { <path d="M12 15.2V4.4" /><path d="M7.6 8.6 12 4.2l4.4 4.4" /><path d="M4.4 15.8v3a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-3" /> }
        @case ('download') { <path d="M12 3.6v10.8" /><path d="M7.6 10.4 12 14.8l4.4-4.4" /><path d="M4.4 17.8v1.4a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-1.4" /> }
        @case ('menu') { <path d="M4 6.5h16M4 12h16M4 17.5h16" /> }
        @case ('logout') { <path d="M9.5 20H5.6A1.6 1.6 0 0 1 4 18.4V5.6A1.6 1.6 0 0 1 5.6 4h3.9" /><path d="M15.5 16.5 20 12l-4.5-4.5" /><path d="M20 12H9.5" /> }
        @case ('key') { <circle cx="7.6" cy="15.4" r="4" /><path d="m10.4 12.6 9.4-9.4M16.6 6.4l2.6 2.6M14.4 8.6l1.8 1.8" /> }
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('search') { <circle cx="10.8" cy="10.8" r="6.6" /><path d="m20.4 20.4-4.9-4.9" /> }
        @case ('x') { <path d="M6 6l12 12M18 6 6 18" /> }
        @case ('check') { <path d="m4.6 12.6 4.6 4.6L19.4 7" /> }
        @case ('alert') { <path d="M12 3.4 21.4 20H2.6z" /><path d="M12 9.6v4.6M12 17.2h.01" /> }
        @case ('refresh') { <path d="M20 11.4A8 8 0 0 0 5.6 6.8L4 8.6" /><path d="M4 3.8v4.8h4.8" /><path d="M4 12.6a8 8 0 0 0 14.4 4.6l1.6-1.8" /><path d="M20 20.2v-4.8h-4.8" /> }
        @case ('file') { <path d="M6 3.5h8.4L18.5 7.6v12.9H6z" /><path d="M14.2 3.6v4.2h4.2" /> }
        @case ('print') { <path d="M6.6 8.4V3.6h10.8v4.8" /><rect x="3.4" y="8.4" width="17.2" height="8" rx="1.8" /><path d="M6.6 14h10.8v6.4H6.6z" /> }
        @case ('back') { <path d="M15 5.5 8.5 12l6.5 6.5" /> }
        @case ('chevron') { <path d="m6.5 9 5.5 5.5L17.5 9" /> }
        @case ('clock') { <circle cx="12" cy="12" r="8.8" /><path d="M12 7.4V12l3.4 2.1" /> }
        @case ('truck') { <path d="M2.8 5.6h11.4v10.2H2.8zM14.2 9.4h3.8l3.2 3.4v3H14.2" /><circle cx="6.6" cy="17.6" r="1.8" /><circle cx="17.4" cy="17.6" r="1.8" /> }
        @case ('bank') { <path d="M3 9.4 12 4l9 5.4" /><path d="M5 9.8v7.6M9.6 9.8v7.6M14.4 9.8v7.6M19 9.8v7.6" /><path d="M3 20h18" /> }
        @case ('swap') { <path d="M4 8h14.4l-3.6-3.6" /><path d="M20 16H5.6l3.6 3.6" /> }
        @case ('import') { <path d="M4 14.8v3.6a1.6 1.6 0 0 0 1.6 1.6h12.8a1.6 1.6 0 0 0 1.6-1.6v-3.6" /><path d="M12 3.6v11" /><path d="m7.8 10.6 4.2 4.2 4.2-4.2" /> }
        @case ('eye') { <path d="M2.4 12s3.6-6.6 9.6-6.6 9.6 6.6 9.6 6.6-3.6 6.6-9.6 6.6S2.4 12 2.4 12z" /><circle cx="12" cy="12" r="2.8" /> }
        @case ('edit') { <path d="M4 20h4.2L19.4 8.8a2.2 2.2 0 0 0-3.2-3.2L5 16.8z" /><path d="m14.6 7.2 3.2 3.2" /> }
        @case ('bell') { <path d="M6 16.6V11a6 6 0 0 1 12 0v5.6l1.6 2H4.4z" /><path d="M10 21h4" /> }
        @case ('lock') { <rect x="4.4" y="10.6" width="15.2" height="10" rx="2" /><path d="M7.8 10.6V7.4a4.2 4.2 0 0 1 8.4 0v3.2" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
}
