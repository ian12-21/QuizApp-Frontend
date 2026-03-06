import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WalletService } from '../../../services/wallet.service';
import { QuizDataService } from '../../../services/quiz-data.service';
import { CreateQuizPopUpComponent } from '../../components/create-quiz-pop-up/create-quiz-pop-up.component';
import { JoinQuizPopUpComponent } from '../../components/join-quiz-pop-up/join-quiz-pop-up.component';

@Component({
  selector: 'app-welcome-page-component',
  imports: [MatDialogModule, RouterModule],
  templateUrl: './welcome-page-component.component.html',
  styleUrls: ['./welcome-page-component.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePageComponent {
  protected readonly walletService = inject(WalletService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly quizDataService = inject(QuizDataService);

  async connectWallet() {
    try {
      await this.walletService.connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  async openCreateQuizDialog() {
    const dialogRef = this.dialog.open(CreateQuizPopUpComponent, {
      width: '400px',
      disableClose: true
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
        // Store quiz data in the service
      const address = this.walletService.address();
      if (address) {
        this.quizDataService.setQuizData({
          quizName: result.quizName,
          numberOfQuestions: result.numberOfQuestions,
          ownerAddress: address
        });
      }
      this.router.navigate(['/quiz-creation', address]);
    }
  }

  async joinQuizDialog() {
    const dialogRef = this.dialog.open(JoinQuizPopUpComponent, {
      width: '400px',
      disableClose: true
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
        // Handle joining the quiz here
      this.router.navigate(['/quiz-queue/quiz-address/', result.quizPin], {
        state: {
          quizAddress: result.quizAddress,
        }
      });
    }
  }
}
