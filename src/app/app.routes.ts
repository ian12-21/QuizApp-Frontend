import { Routes } from '@angular/router';
import { WelcomePageComponent } from './pages/welcome-page-component/welcome-page-component.component';
import { CreateQuestionsComponent } from './pages/create-questions-component/create-questions-component.component';
import { QuizQueueComponent } from './pages/quiz-queue/quiz-queue.component';
import { LiveQuizComponent } from './pages/live-quiz/live-quiz.component';

export const routes: Routes = [
  { path: '', component: WelcomePageComponent },
  { path: 'quiz-creation/:address', component: CreateQuestionsComponent },
  { path: 'quiz-queue/quiz-address/:pin', component: QuizQueueComponent },
  { path: 'active-quiz/:pin', component: LiveQuizComponent }
];


//example
/*
export const routes: Routes = [
  { path: '', component: ListingComponent },
  { path: 'artists/:artist/albums/:album/:address', component: AlbumComponent },
  { path: 'terms-and-conditions', component: TandcComponent },
  { path: 'privacy-policy', component: PpolicyComponent },
  { path: 'how-it-works', component: ManualComponent },
  { path: 'about', component: AboutComponent },
  { path: 'explore', component: ExplorePageComponent },
  { path: 'user', component: UserPageComponent },
  { path: 'account-details/:address/listing/:artist', component: AccountDetailsComponent },
  { path: 'user/account-details/listing/:address', component: AccountDetailsComponent },
  { path: 'account-details/:address/listing/:author', component: AccountDetailsComponent},
  { path: 'docs', component: DocumentationPageComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'faq', component: FaqComponent }
];
*/ 