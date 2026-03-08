import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QuizService } from '../../../../core/services/quiz-contracts.service';
import { QuizDataService } from '../../../../core/services/quiz-data.service';
import { SocketService } from '../../../../core/services/socket.service';
import { Question, QuizByPinResponse } from '../../../../core/models/quiz.models';
import { startQuestionTimer, QuestionTimer } from '../quiz-timer.utils';

@Component({
  selector: 'app-live-quiz-host',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './live-quiz-host.component.html',
  styleUrls: ['./live-quiz-host.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQuizHostComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  private readonly quizDataService = inject(QuizDataService);
  private readonly socketService = inject(SocketService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly quizName = signal('');
  readonly quizAddress = signal('');
  readonly quizPin = signal('');
  readonly creatorAddress = signal('');
  readonly questions = signal<Question[]>([]);
  readonly currentQuestionIndex = signal(0);
  readonly isFinished = signal(false);
  readonly timerWidth = signal(100);
  readonly canEndQuiz = signal(false);

  readonly currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()] ?? null);

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
    this.quizAddress.set(quizData.quizAddress);
    this.quizPin.set(quizData.pin);
    this.quizName.set(quizData.quizName);
    this.creatorAddress.set(quizData.creatorAddress);
    this.questions.set(quizData.questions);

    if (quizData.questions.length > 0) {
      this.currentQuestionIndex.set(0);
      this.startTimers();
    }
  }

  private startTimers() {
    this.timer?.clear();
    this.timerWidth.set(100);

    this.timer = startQuestionTimer(
      (width) => this.timerWidth.set(width),
      () => this.onQuestionExpired()
    );
  }

  private onQuestionExpired() {
    if (this.currentQuestionIndex() < this.questions().length - 1) {
      this.currentQuestionIndex.update(i => i + 1);
      this.startTimers();
    } else {
      this.isFinished.set(true);
    }
  }

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

  async endQuiz() {
    this.quizDataService.clearActiveQuiz();

    try {
      await this.quizService.endQuiz(this.quizAddress(), this.creatorAddress(), this.quizPin());
      this.socketService.endQuiz(this.quizAddress(), this.quizPin());
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }
}
