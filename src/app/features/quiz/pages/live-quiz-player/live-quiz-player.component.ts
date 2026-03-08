import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WalletService } from '../../../../core/services/wallet.service';
import { QuizService } from '../../../../core/services/quiz-contracts.service';
import { SocketService } from '../../../../core/services/socket.service';
import { Question, UserAnswer, QuizByPinResponse } from '../../../../core/models/quiz.models';
import { startQuestionTimer, QUESTION_DURATION, QuestionTimer } from '../quiz-timer.utils';

@Component({
  selector: 'app-live-quiz-player',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './live-quiz-player.component.html',
  styleUrls: ['./live-quiz-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQuizPlayerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  private readonly walletService = inject(WalletService);
  private readonly socketService = inject(SocketService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly quizName = signal('');
  readonly questions = signal<Question[]>([]);
  readonly currentQuestionIndex = signal(0);
  readonly selectedAnswer = signal<number | null>(null);
  readonly isFinished = signal(false);
  readonly timerWidth = signal(100);

  readonly currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()] ?? null);

  private userAnswer: UserAnswer = { quizAddress: '', userAddress: '', questionIndex: 0, answer: 'X', answerTimeMs: 0 };
  private questionStartTime = 0;
  private timer: QuestionTimer | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.timer?.clear());

    const quizData: QuizByPinResponse = this.route.snapshot.data['quizData'];
    this.initializeFromData(quizData);

    this.socketService.onQuizEnd$().pipe(
      takeUntilDestroyed()
    ).subscribe(data => {
      this.router.navigate([data.redirectUrl]);
    });
  }

  private initializeFromData(quizData: QuizByPinResponse) {
    this.quizName.set(quizData.quizName);
    this.questions.set(quizData.questions);
    this.userAnswer.quizAddress = quizData.quizAddress;
    this.userAnswer.userAddress = this.walletService.address();

    if (quizData.questions.length > 0) {
      this.currentQuestionIndex.set(0);
      this.startTimers();
    }
  }

  private startTimers() {
    this.timer?.clear();
    this.timerWidth.set(100);
    this.questionStartTime = Date.now();

    this.timer = startQuestionTimer(
      (width) => this.timerWidth.set(width),
      () => this.onQuestionExpired()
    );
  }

  private onQuestionExpired() {
    if (this.selectedAnswer() === null) {
      this.submitAnswerWithMaxTime();
    }

    if (this.currentQuestionIndex() < this.questions().length - 1) {
      this.currentQuestionIndex.update(i => i + 1);
      this.selectedAnswer.set(null);
      this.startTimers();
    } else {
      this.isFinished.set(true);
    }
  }

  selectAnswer(index: number) {
    this.selectedAnswer.set(index);
  }

  async submitAnswer() {
    if (this.selectedAnswer() !== null) {
      const answerTime = Date.now() - this.questionStartTime;
      this.userAnswer.answer = this.selectedAnswer()!;
      this.userAnswer.questionIndex = this.currentQuestionIndex();
      this.userAnswer.answerTimeMs = answerTime;
    }
    try {
      await this.quizService.submitAnswer(this.userAnswer);
      this.snackBar.open('Answer submitted successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      this.snackBar.open('Failed to submit answer. Please try again.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
  }

  private async submitAnswerWithMaxTime() {
    this.userAnswer.answer = 'X';
    this.userAnswer.questionIndex = this.currentQuestionIndex();
    this.userAnswer.answerTimeMs = QUESTION_DURATION;

    try {
      await this.quizService.submitAnswer(this.userAnswer);
    } catch (error) {
      console.error('Error submitting max time answer:', error);
    }
  }
}
