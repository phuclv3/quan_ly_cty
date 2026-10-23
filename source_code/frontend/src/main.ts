import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { khoiTaoTooltip } from './app/shared/tooltip';

khoiTaoTooltip();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
