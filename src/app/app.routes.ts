import { Routes } from '@angular/router';
import { quizCreationGuard } from '../services/auth-guard.service';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/welcome-page-component/welcome-page-component.component')
      .then(m => m.WelcomePageComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about-page/about-page.component')
      .then(m => m.AboutPageComponent)
  },
  {
    path: 'quiz-creation/:address',
    loadComponent: () => import('./pages/create-questions-component/create-questions-component.component')
      .then(m => m.CreateQuestionsComponent),
    canActivate: [quizCreationGuard]
  },
  {
    path: 'quiz-queue/:quiz-address/:pin',
    loadComponent: () => import('./pages/quiz-queue/quiz-queue.component')
      .then(m => m.QuizQueueComponent)
  },
  {
    path: 'active-quiz/:pin',
    loadComponent: () => import('./pages/live-quiz/live-quiz.component')
      .then(m => m.LiveQuizComponent)
  },
  {
    path: 'leaderboard/:quiz-address/:pin',
    loadComponent: () => import('./pages/leaderboard-page/leaderboard-page.component')
      .then(m => m.LeaderboardPageComponent)
  },
  {
    path: 'search-results',
    loadComponent: () => import('./pages/search-and-results/search-and-results.component')
      .then(m => m.SearchAndResultsComponent)
  },
];
