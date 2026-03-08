import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { QuizData, ActiveQuiz } from '../models/quiz.models';

@Injectable({
  providedIn: 'root'
})
export class QuizDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly activeQuizKey = 'activeQuiz';

  // Internal signals to hold quiz data
  private readonly _quizData = signal<QuizData | null>(null);
  private readonly _activeQuizData = signal<ActiveQuiz | null>(null);
  // Expose readonly signals for components to subscribe to
  // Somethin similar to a BehaviorSubject in RxJS, but using Angular's signal system 
  // --> or also getters and setters, but signals are more efficient and easier to manage in this case
  readonly quizData = this._quizData.asReadonly();
  readonly activeQuizData = this._activeQuizData.asReadonly();

  constructor() {
    if (this.isBrowser) {
      this.hydrateFromStorage();
    }
  }

  private hydrateFromStorage(): void {
    try {
      const data = sessionStorage.getItem(this.activeQuizKey);
      if (data) {
        this._activeQuizData.set(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error hydrating quiz data from sessionStorage:', error);
    }
  }

  setQuizData(data: QuizData): void {
    this._quizData.set(data);
  }

  getQuizData(): QuizData | null {
    return this._quizData();
  }

  clearQuizData(): void {
    this._quizData.set(null);
  }

  setActiveQuiz(quizInfo: ActiveQuiz): void {
    this._activeQuizData.set(quizInfo);

    if (this.isBrowser) {
      try {
        sessionStorage.setItem(this.activeQuizKey, JSON.stringify(quizInfo));
      } catch (error) {
        console.error('Error storing quiz data in sessionStorage:', error);
      }
    }
  }

  // Get active quiz data
  getActiveQuiz(): ActiveQuiz | null {
    return this._activeQuizData();
  }

  // Clear active quiz data
  clearActiveQuiz(): void {
    this._activeQuizData.set(null);

    if (this.isBrowser) {
      try {
        sessionStorage.removeItem(this.activeQuizKey);
      } catch (error) {
        console.error('Error removing quiz data from sessionStorage:', error);
      }
    }
  }
}
