import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WalletService } from '../../services/wallet.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CreateQuizPopUpComponent } from '../create-quiz-pop-up/create-quiz-pop-up.component';
import { JoinQuizPopUpComponent } from '../join-quiz-pop-up/join-quiz-pop-up.component';

@Component({
    selector: 'app-welcome-page-component',
    standalone: true,
    imports: [CommonModule, MatDialogModule],
    templateUrl: './welcome-page-component.component.html',
    styleUrls: ['./welcome-page-component.component.scss']
})
export class WelcomePageComponent implements OnInit {

  constructor(
    public walletService: WalletService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit() {
    if(isPlatformBrowser(this.platformId)){
      
    }
  }

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
        // Handle the quiz creation here
        console.log('Quiz to create:', result);
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
        console.log('Joining quiz with PIN:', result.quizPin);
      }
    });
  }
}