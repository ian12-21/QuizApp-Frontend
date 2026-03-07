import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WalletService } from '../../../../core/services/wallet.service';
import { QuizService } from '../../../../core/services/quiz-contracts.service';
import { QuizDataService } from '../../../../core/services/quiz-data.service';
import { SocketService } from '../../../../core/services/socket.service';
import { Question, UserAnswer } from '../../../../core/models/quiz.models';

@Component({
  selector: 'app-live-quiz',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './live-quiz.component.html',
  styleUrls: ['./live-quiz.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQuizComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  protected readonly walletService = inject(WalletService);
  private readonly quizDataService = inject(QuizDataService);
  private readonly socketService = inject(SocketService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly quizPin = signal('');
  readonly quizAddress = signal('');
  readonly quizName = signal('');
  readonly creatorAddress = signal('');
  readonly questions = signal<Question[]>([]);
  readonly currentQuestionIndex = signal(0);
  readonly selectedAnswer = signal<number | null>(null);
  readonly isFinished = signal(false);
  readonly timerWidth = signal(100);
  readonly canEndQuiz = signal(false);

  readonly isCreator = computed(() => this.walletService.address() === this.creatorAddress());
  readonly currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()] ?? null);

  private userAnswer: UserAnswer = { quizAddress: '', userAddress: '', questionIndex: 0, answer: 'X', answerTimeMs: 0 };
  private questionTimer: ReturnType<typeof setTimeout> | undefined;
  private timerInterval: ReturnType<typeof setInterval> | undefined;
  private readonly QUESTION_DURATION = 20000;
  private questionStartTime = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimers());

    this.route.params.pipe(
      takeUntilDestroyed()
    ).subscribe(params => {
      this.quizPin.set(params['pin']);
      this.initializeQuiz();
    });

    this.socketService.onQuizEnd$().pipe(
      takeUntilDestroyed()
    ).subscribe(data => {
      this.router.navigate([data.redirectUrl]);
    });
  }

  private async initializeQuiz() {
    try {
      const quizInfo = await this.quizService.getQuizByPin(this.quizPin());

      if (quizInfo) {
        this.quizAddress.set(quizInfo.quizAddress);
        this.quizName.set(quizInfo.quizName);
        this.creatorAddress.set(quizInfo.creatorAddress);
        this.questions.set(quizInfo.questions);
        this.userAnswer.quizAddress = quizInfo.quizAddress;
        this.userAnswer.userAddress = this.walletService.address();

        if (quizInfo.questions.length > 0) {
          this.currentQuestionIndex.set(0);
          this.startTimers();
        }
      }
    } catch (error) {
      console.error('Error initializing quiz:', error);
      this.router.navigate(['/']);
    }
  }

  private clearTimers() {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private startTimers() {
    this.timerWidth.set(100);
    this.questionStartTime = Date.now();
    
    // Clear any existing timers
    this.clearTimers();

    // Create a timer that updates the width every 200ms
    const updateFrequency = 200; // milliseconds
    const steps = this.QUESTION_DURATION / updateFrequency;
    const decrementPerStep = 100 / steps;

    this.timerInterval = setInterval(() => {
      this.timerWidth.update(w => Math.max(0, w - decrementPerStep));
    }, updateFrequency);

    // Set the question timer to move to the next question
    this.questionTimer = setTimeout(() => {
      // Clear the timer interval
      clearInterval(this.timerInterval);

      // If user hasn't submitted an answer, submit with max time
      if (!this.isCreator() && this.selectedAnswer() === null) {
        this.submitAnswerWithMaxTime();
      }

      if (this.currentQuestionIndex() < this.questions().length - 1) {
        this.currentQuestionIndex.update(i => i + 1);
        this.selectedAnswer.set(null);
        this.startTimers();
      } else {
        // Last question finished
        this.isFinished.set(true);
      }
    }, this.QUESTION_DURATION);
  }

  selectAnswer(index: number) {
    if (!this.isCreator()) {
      this.selectedAnswer.set(index);
    }
  }

  async submitAnswer() {
    //save to backend every time submit is pressed
    if (this.selectedAnswer() !== null) {
      // Calculate answer time in milliseconds
      const answerTime = Date.now() - this.questionStartTime;
      this.userAnswer.answer = this.selectedAnswer()!;
      this.userAnswer.questionIndex = this.currentQuestionIndex();
      this.userAnswer.answerTimeMs = answerTime;
    }
    try {
      await this.quizService.submitAnswer(this.userAnswer);
      // Show success snackbar
      this.snackBar.open('Answer submitted successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      // Show error snackbar
      this.snackBar.open('Failed to submit answer. Please try again.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
  }

  // Helper method to submit answer with max time when user doesn't answer
  private async submitAnswerWithMaxTime() {
    this.userAnswer.answer = 'X'; // 'X' indicates no answer
    this.userAnswer.questionIndex = this.currentQuestionIndex();
    this.userAnswer.answerTimeMs = this.QUESTION_DURATION;

    try {
      await this.quizService.submitAnswer(this.userAnswer);
    } catch (error) {
      console.error('Error submitting max time answer:', error);
    }
  }

  async endQuiz() {
    if (!this.isCreator()) return;

    this.quizDataService.clearQuizData();

    try {
      await this.quizService.endQuiz(this.quizAddress(), this.creatorAddress(), this.quizPin());
      this.socketService.endQuiz(this.quizAddress(), this.quizPin());
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }

  //function for submitting all users' answers to backend & contract with frontend signing
  async submitAllUsersAnswers() {
    try {
      const response = await this.quizService.submitAllUsersAnswersWithFrontendSigning(this.quizAddress());

      if (response.success) {
        this.canEndQuiz.set(true);
      } else {
        throw new Error('Failed to submit answers');
      }
    } catch (error) {
      console.error('Error submitting all answers:', error);
      this.snackBar.open('Failed to submit answers. Please try again.', 'Close', { duration: 3000 });
    }
  }
}
