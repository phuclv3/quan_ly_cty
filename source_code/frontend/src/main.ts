import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { khoiTaoTooltip } from './app/shared/tooltip';

khoiTaoTooltip();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// PWA: đăng ký service worker (đường dẫn tương đối để chạy được cả khi app nằm dưới thư mục con).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
