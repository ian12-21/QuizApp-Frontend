import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { QuizService } from '../services/quiz-contracts.service';
import { QuizDataService } from '../services/quiz-data.service';
import { waitForWallet } from './wait-for-wallet';

export const quizHostGuard: CanActivateFn = async (route) => {
  const walletService = await waitForWallet();
  const quizDataService = inject(QuizDataService);
  const quizService = inject(QuizService);
  const router = inject(Router);

  const pin = route.params['pin'];
  const userAddress = walletService.address();

  // Fast path: check sessionStorage-persisted active quiz
  const activeQuiz = quizDataService.getActiveQuiz();
  if (activeQuiz && activeQuiz.isCreator && activeQuiz.creatorAddress === userAddress) {
    return true;
  }

  // Fallback: verify against backend
  try {
    const quiz = await quizService.getQuizByPin(pin);
    if (quiz && quiz.creatorAddress === userAddress) {
      return true;
    }
  } catch { /* fall through to redirect */ }

  router.navigate(['/active-quiz', pin]);
  return false;
};
