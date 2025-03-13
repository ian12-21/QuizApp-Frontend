import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WalletService } from '../../../services/wallet.service';
import { CommonModule } from '@angular/common';
import { CreateQuizPopUpComponent } from '../../components/create-quiz-pop-up/create-quiz-pop-up.component';
import { JoinQuizPopUpComponent } from '../../components/join-quiz-pop-up/join-quiz-pop-up.component';
import { Router } from '@angular/router';
import { QuizDataService } from '../../../services/quiz-data.service';

@Component({
    selector: 'app-welcome-page-component',
    standalone: true,
    imports: [CommonModule, MatDialogModule],
    templateUrl: './welcome-page-component.component.html',
    styleUrls: ['./welcome-page-component.component.scss']
})
export class WelcomePageComponent {
  
  constructor(
    public walletService: WalletService,
    private dialog: MatDialog,
    private router: Router,
    private quizDataService: QuizDataService
  ) {}

  async connectWallet() {
    try {
      await this.walletService.connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  openCreateQuizDialog() {
    const dialogRef = this.dialog.open(CreateQuizPopUpComponent, {
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
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
    });
  }

  joinQuizDialog() {
    const dialogRef = this.dialog.open(JoinQuizPopUpComponent, {
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle joining the quiz here
        this.router.navigate(['/quiz-queue/quiz-address/', result.quizPin], {
          state: {
            quizAddress: result.quizAddress,
          }
        });
      }
    });
  }
}