import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WalletService } from '../../../../core/services/wallet.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CreateQuizDialogComponent } from '../../dialogs/create-quiz-dialog/create-quiz-dialog.component';
import { JoinQuizDialogComponent } from '../../dialogs/join-quiz-dialog/join-quiz-dialog.component';

@Component({
  selector: 'app-welcome-page',
  imports: [MatDialogModule, MatButtonModule, RouterModule],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePageComponent {
  protected readonly walletService = inject(WalletService);
  protected readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly isLoggingIn = signal(false);
  readonly loginError = signal<string | null>(null);

  async connectAndLogin(): Promise<void> {
    this.isLoggingIn.set(true);
    this.loginError.set(null);

    try {
      const connected = await this.walletService.connect();
      if (!connected) {
        this.loginError.set('Wallet connection failed.');
        return;
      }

      const loggedIn = await this.authService.login();
      if (!loggedIn) {
        return;
      }
    } catch (error: any) {
      console.error('Connect & login failed:', error);
      this.loginError.set(error?.message ?? 'Login failed. Please try again.');
    } finally {
      this.isLoggingIn.set(false);
    }
  }

  async openCreateQuizDialog(): Promise<void> {
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

  async joinQuizDialog(): Promise<void> {
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
