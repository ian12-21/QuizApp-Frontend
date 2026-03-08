import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WalletService } from '../../../../core/services/wallet.service';
import { CreateQuizDialogComponent } from '../../components/create-quiz-dialog/create-quiz-dialog.component';
import { JoinQuizDialogComponent } from '../../components/join-quiz-dialog/join-quiz-dialog.component';

@Component({
  selector: 'app-welcome-page',
  imports: [MatDialogModule, RouterModule],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePageComponent {
  protected readonly walletService = inject(WalletService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  async connectWallet() {
    try {
      await this.walletService.connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  async openCreateQuizDialog() {
    const dialogRef = this.dialog.open(CreateQuizDialogComponent, {
      width: '400px',
      disableClose: true
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      const address = this.walletService.address();
      this.router.navigate(['/quiz-creation', address], {
        state: {
          quizName: result.quizName,
          numberOfQuestions: result.numberOfQuestions,
          ownerAddress: address
        }
      });
    }
  }

  async joinQuizDialog() {
    const dialogRef = this.dialog.open(JoinQuizDialogComponent, {
      width: '400px',
      disableClose: true
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      this.router.navigate(['/quiz-queue/quiz-address/', result.quizPin], {
        state: {
          quizAddress: result.quizAddress,
        }
      });
    }
  }
}
