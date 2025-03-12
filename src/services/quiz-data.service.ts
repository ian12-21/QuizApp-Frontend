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
}
