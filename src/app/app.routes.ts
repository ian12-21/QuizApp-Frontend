import { Routes } from '@angular/router';
import { WelcomePageComponent } from './pages/welcome-page-component/welcome-page-component.component';
import { CreateQuestionsComponent } from './pages/create-questions-component/create-questions-component.component';
import { QuizQueueComponent } from './pages/quiz-queue/quiz-queue.component';
import { LiveQuizComponent } from './pages/live-quiz/live-quiz.component';
import { QuizCreationGuard } from '../services/auth-guard.service';
import { LeaderboardPageComponent } from './pages/leaderboard-page/leaderboard-page.component';
import { SearchAndResultsComponent } from './pages/search-and-results/search-and-results.component';

export const routes: Routes = [
  { path: '', component: WelcomePageComponent },
  { path: 'quiz-creation/:address', component: CreateQuestionsComponent, canActivate: [QuizCreationGuard] },
  { path: 'quiz-queue/:quiz-address/:pin', component: QuizQueueComponent },
  { path: 'active-quiz/:pin', component: LiveQuizComponent },
  { path: 'leaderboard/:quiz-address/:pin', component: LeaderboardPageComponent },
  { path: 'search-results', component: SearchAndResultsComponent },
];