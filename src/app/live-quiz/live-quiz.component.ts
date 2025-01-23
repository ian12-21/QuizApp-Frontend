import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { QuizService } from '../../services/quizContracts.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-live-quiz',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './live-quiz.component.html',
  styleUrls: ['./live-quiz.component.scss']
})
export class LiveQuizComponent implements OnInit, OnDestroy {
  quizPin: string = '';
  quizAddress: string = '';
  quizName: string = '';
  creatorAddress: string = '';
  questions: Array<{ question: string; answers: string[]; correctAnswer: number }> = [];
  currentQuestionIndex: number = 0;
  selectedAnswer: number | null = null;
  userAnswers: { address: string | null; answers: number[] } = { address: '', answers: [] };
  isCreator: boolean = false;
  private questionTimer: any;
  private readonly QUESTION_DURATION = 20000; // 20 seconds

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private walletService: WalletService,
    private dialog: MatDialog
  ) {
    this.userAnswers.address = this.walletService.address();
  }

  async ngOnInit() {
    try {
      // Get quiz pin from URL
      this.route.params.subscribe(async params => {
        const pin = params['pin'];
        if (!pin) {
          console.error('No quiz PIN provided');
          this.router.navigate(['/']);
          return;
        }

        this.quizPin = pin;
        const quizInfo = await this.quizService.getQuizByPin(this.quizPin);
        
        if (quizInfo) {
          this.quizAddress = quizInfo.quizAddress;
          this.quizName = quizInfo.quizName;
          this.creatorAddress = quizInfo.creatorAddress;
          this.questions = quizInfo.questions;
          this.isCreator = this.creatorAddress === this.walletService.address();
          
          // Start displaying questions
          this.startQuestionTimer();
        }
      });
    } catch (error) {
      console.error('Error initializing live quiz:', error);
    }
  }

  ngOnDestroy() {
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
    }
  }

  private startQuestionTimer() {
    this.questionTimer = setInterval(() => {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
        this.selectedAnswer = null;
      } else {
        clearInterval(this.questionTimer);
        if (this.isCreator) {
          this.showEndQuizButton();
        }
      }
    }, this.QUESTION_DURATION);
  }

  submitAnswer() {
    if (this.selectedAnswer !== null) {
      this.userAnswers.answers[this.currentQuestionIndex] = this.selectedAnswer;
    }
  }

  private showEndQuizButton() {
    // Implementation for showing end quiz button and handling quiz completion
    // This will be implemented when we create the template
  }

  async endQuiz() {
    if (!this.isCreator) return;

    try {
      // Commented out until backend endpoint is ready
      /*const result = await this.quizService.endQuiz(
        this.quizAddress,
        this.creatorAddress,
        this.quizPin,
        {} // Player scores will be calculated on backend
      );

      // Show winner dialog
      this.dialog.open(WinnerDialogComponent, {
        data: {
          winner: result.winner,
          score: result.score
        }
      });*/
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }
}
