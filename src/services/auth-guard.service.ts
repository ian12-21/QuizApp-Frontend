import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletService } from './wallet.service';
import { QuizDataService } from './quiz-data.service';

export const quizCreationGuard: CanActivateFn = () => {
  const quizDataService = inject(QuizDataService);
  const walletService = inject(WalletService);
  const router = inject(Router);

  const quizData = quizDataService.getQuizData();

  if (!quizData || quizData.ownerAddress !== walletService.address()) {
    router.navigate(['']);
    return false;
  }

  return true;
};
