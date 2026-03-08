import { Routes } from '@angular/router';
import { quizCreationGuard } from '../../core/guards/quiz-creation.guard';
import { quizHostGuard } from '../../core/guards/quiz-host.guard';
import { quizResolver } from '../../core/resolvers/quiz.resolver';

export const quizRoutes: Routes = [
  {
    path: 'quiz-creation/:user-address',
    loadComponent: () => import('./pages/create-questions/create-questions.component')
      .then(m => m.CreateQuestionsComponent),
    canActivate: [quizCreationGuard]
  },
  {
    path: 'quiz-queue/:quiz-address/:pin',
    loadComponent: () => import('./pages/quiz-queue/quiz-queue.component')
      .then(m => m.QuizQueueComponent),
    resolve: { quizData: quizResolver }
  },
  {
    path: 'active-quiz/:pin/host',
    loadComponent: () => import('./pages/live-quiz-host/live-quiz-host.component')
      .then(m => m.LiveQuizHostComponent),
    canActivate: [quizHostGuard],
    resolve: { quizData: quizResolver }
  },
  {
    path: 'active-quiz/:pin',
    loadComponent: () => import('./pages/live-quiz-player/live-quiz-player.component')
      .then(m => m.LiveQuizPlayerComponent),
    resolve: { quizData: quizResolver }
  },
];
