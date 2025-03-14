import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface QuizData {
  quizName: string;
  numberOfQuestions: number;
  ownerAddress: string;
}

interface ActiveQuiz {
  pin: string;
  quizName: string;
  creatorAddress: string;
  quizAddress: string;
  isCreator: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class QuizDataService {
  private quizData: QuizData | null = null;
  private activeQuizData: ActiveQuiz | null = null;
  private activeQuizKey = 'activeQuiz';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  setQuizData(data: QuizData): void {
    this.quizData = data;
  }

  getQuizData(): QuizData | null {
    return this.quizData;
  }

  clearQuizData(): void {
    this.quizData = null;
  }

  // Set active quiz data
  setActiveQuiz(quizInfo: ActiveQuiz): void {
    // Always store in memory for server-side rendering
    this.activeQuizData = quizInfo;
    
    // Also store in sessionStorage if in browser
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
    // If we're in the browser, try to get from sessionStorage first
    if (this.isBrowser) {
      try {
        const data = sessionStorage.getItem(this.activeQuizKey);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Error retrieving quiz data from sessionStorage:', error);
      }
    }
    
    // Fall back to memory storage
    return this.activeQuizData;
  }

  // Clear active quiz data
  clearActiveQuiz(): void {
    this.activeQuizData = null;
    
    if (this.isBrowser) {
      try {
        sessionStorage.removeItem(this.activeQuizKey);
      } catch (error) {
        console.error('Error removing quiz data from sessionStorage:', error);
      }
    }
  }
}
