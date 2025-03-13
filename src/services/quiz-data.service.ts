import { Injectable } from '@angular/core';

interface QuizData {
  quizName: string;
  numberOfQuestions: number;
  ownerAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuizDataService {
  private quizData: QuizData | null = null;
  private activeQuizKey = 'activeQuiz';

  constructor() { }

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
    setActiveQuiz(quizInfo: any): void {
      sessionStorage.setItem(this.activeQuizKey, JSON.stringify(quizInfo));
    }
  
    // Get active quiz data
    getActiveQuiz(): any {
      const data = sessionStorage.getItem(this.activeQuizKey);
      return data ? JSON.parse(data) : null;
    }
  
    // Clear active quiz data
    clearActiveQuiz(): void {
      sessionStorage.removeItem(this.activeQuizKey);
    }
}
