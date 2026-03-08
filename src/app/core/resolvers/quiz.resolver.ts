import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { QuizService } from '../services/quiz-contracts.service';
import { QuizByPinResponse } from '../models/quiz.models';

// Resolver to fetch quiz data by PIN before activating the route
export const quizResolver: ResolveFn<QuizByPinResponse> = async (route) => {
  const quizService = inject(QuizService);
  const router = inject(Router);

  const pin = route.params['pin'];
  if (!pin) {
    router.navigate(['/']);
    throw new Error('No PIN in route');
  }

  try {
    const quiz = await quizService.getQuizByPin(pin);
    if (!quiz) {
      router.navigate(['/']);
      throw new Error('Quiz not found');
    }
    return quiz;
  } catch (error) {
    router.navigate(['/']);
    throw error;
  }
};
