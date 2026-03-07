import { Routes } from '@angular/router';

export const resultsRoutes: Routes = [
  {
    path: 'leaderboard/:quiz-address/:pin',
    loadComponent: () => import('./pages/leaderboard/leaderboard.component')
      .then(m => m.LeaderboardComponent)
  },
  {
    path: 'search-results',
    loadComponent: () => import('./pages/search-results/search-results.component')
      .then(m => m.SearchResultsComponent)
  },
];
