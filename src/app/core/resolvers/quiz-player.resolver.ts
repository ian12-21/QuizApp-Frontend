import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { QuizService } from '../services/quiz-contracts.service';
import { QuizByPinResponse } from '../models/quiz.models';
import { waitForWallet } from '../guards/wait-for-wallet';

export const quizPlayerResolver: ResolveFn<QuizByPinResponse> = async (route) => {
  const quizService = inject(QuizService);
  const router = inject(Router);
  const walletService = await waitForWallet();

  const pin = route.params['pin'];
  const userAddress = walletService.address()?.toLowerCase();

  if (!pin || !userAddress) {
    router.navigate(['/']);
    throw new Error('Missing PIN or wallet address');
  }

  try {
    const quiz = await quizService.getQuizByPin(pin);
    if (!quiz) {
      router.navigate(['/']);
      throw new Error('Quiz not found');
    }

    const isParticipant = quiz.playerAddresses?.some(
      (addr) => addr.toLowerCase() === userAddress
    );

    if (!isParticipant) {
      router.navigate(['/']);
      throw new Error('User is not a participant in this quiz');
    }

    return quiz;
  } catch (error) {
    router.navigate(['/']);
    throw error;
  }
};
