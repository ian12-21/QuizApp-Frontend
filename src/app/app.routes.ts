import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes')
      .then(m => m.homeRoutes)
  },
  {
    path: 'about',
    loadChildren: () => import('./features/about/about.routes')
      .then(m => m.aboutRoutes)
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.routes')
      .then(m => m.profileRoutes)
  },
  {
    path: '',
    loadChildren: () => import('./features/quiz/quiz.routes')
      .then(m => m.quizRoutes)
  },
  {
    path: '',
    loadChildren: () => import('./features/results/results.routes')
      .then(m => m.resultsRoutes)
  },
];
