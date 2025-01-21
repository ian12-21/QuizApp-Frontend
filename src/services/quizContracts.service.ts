// src/app/services/quiz.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// import { environment } from '../../environments/environment';
import { WalletService } from './wallet.service';

interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  // private apiUrl = environment.apiUrl;
  private apiUrl = 'http://localhost:3000/api';
  private quizData: Map<string, any> = new Map();

  constructor(
    private http: HttpClient,
    private walletService: WalletService
  ) {}

  async createQuiz(quizName: string, questions: QuizQuestion[]) {
    try {
      const response = await firstValueFrom(this.http.post<{
        quizAddress: string;
        pin: string;
      }>(`${this.apiUrl}/quiz/create`, {
        creatorAddress: this.walletService.address(),
        questions
      }));

      // Store quiz data securely
      this.quizData.set(response.quizAddress, {
        name: quizName,
        questions,
      });

      return {
        quizAddress: response.quizAddress,
        pin: response.pin
      };
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  }

  async getQuizByPin(pin: string) {
    try {
      const response = await firstValueFrom(this.http.get<{
        quizAddress: string;
      }>(`${this.apiUrl}/quiz/${pin}`));
      return response;
    } catch (error) {
      console.error('Error getting quiz:', error);
      throw error;
    }
  }

  async startQuiz(quizAddress: string, pin: string, players: string[]) {
    try {
      return await firstValueFrom(this.http.post<{
        startTime: string;
      }>(`${this.apiUrl}/quiz/start`, {
        quizAddress,
        creatorAddress: this.walletService.address(),
        pin,
        players
      }));
    } catch (error) {
      console.error('Error starting quiz:', error);
      throw error;
    }
  }

  async endQuiz(quizAddress: string, players: string[], scores: number[]) {
    try {
      const quizData = this.quizData.get(quizAddress);
      if (!quizData) {
        throw new Error('Quiz data not found');
      }

      const response = await firstValueFrom(this.http.post<{
        winner: string;
        score: string;
      }>(`${this.apiUrl}/quiz/end`, {
        quizAddress,
        creatorAddress: this.walletService.address(),
        players,
        scores
      }));

      return response;
    } catch (error) {
      console.error('Error ending quiz:', error);
      throw error;
    }
  }
}