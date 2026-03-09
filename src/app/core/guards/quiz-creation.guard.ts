import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { waitForWallet } from './wait-for-wallet';

// Guard to ensure that only the quiz creator can access the quiz creation page
// async because we need to wait for wallet readiness before accessing its state
export const quizCreationGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const walletService = await waitForWallet();

  const routeAddress = route.params['user-address'];
  const walletAddress = walletService.address();

  if (!walletAddress || walletAddress !== routeAddress) {
    router.navigate(['']);
    return false;
  }

  return true;
};
