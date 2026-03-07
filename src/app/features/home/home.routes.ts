import { Routes } from '@angular/router';

export const homeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/welcome-page/welcome-page.component')
      .then(m => m.WelcomePageComponent)
  },
];
