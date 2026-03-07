import { Routes } from '@angular/router';

export const aboutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/about/about.component')
      .then(m => m.AboutComponent)
  },
];
