import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { WalletService } from "./wallet.service";
import { QuizDataService } from "./quiz-data.service";

@Injectable({
  providedIn: 'root',
})
export class QuizCreationGuard implements CanActivate {
  constructor(
    private quizDataService: QuizDataService,
    private walletService: WalletService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const quizData = this.quizDataService.getQuizData();

    if (!quizData || quizData.ownerAddress !== this.walletService.address()) {
      this.router.navigate(['']);
      return false;
    }

    return true;
  }
}
