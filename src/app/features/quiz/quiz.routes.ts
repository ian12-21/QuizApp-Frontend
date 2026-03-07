import { Routes } from '@angular/router';
import { quizCreationGuard } from '../../core/guards/quiz-creation.guard';

export const quizRoutes: Routes = [
  {
    path: 'quiz-creation/:address',
    loadComponent: () => import('./pages/create-questions/create-questions.component')
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
];
