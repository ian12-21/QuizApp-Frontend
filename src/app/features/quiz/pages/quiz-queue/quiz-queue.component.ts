import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { QuizService } from '../../../../core/services/quiz-contracts.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { QuizDataService } from '../../../../core/services/quiz-data.service';
import { SocketService } from '../../../../core/services/socket.service';
import { QuizByPinResponse } from '../../../../core/models/quiz.models';

@Component({
  selector: 'app-quiz-queue',
  templateUrl: './quiz-queue.component.html',
  styleUrls: ['./quiz-queue.component.scss'],
  imports: [MatCardModule, MatListModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizQueueComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  protected readonly walletService = inject(WalletService);
  private readonly quizDataService = inject(QuizDataService);
  private readonly socketService = inject(SocketService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly quizAddress = signal('');
  readonly quizName = signal('');
  readonly quizPin = signal('');
  readonly players = computed(() => this.socketService.players());
  readonly creatorAddress = signal('');

  constructor() {
    if (!this.isBrowser) return;

    this.socketService.onQuizStart$().pipe(
      takeUntilDestroyed()
    ).subscribe(data => {
      const activeQuiz = this.quizDataService.getActiveQuiz();
      if (activeQuiz?.isCreator) {
        this.router.navigate([data.redirectUrl + '/host']);
      } else {
        this.router.navigate([data.redirectUrl]);
      }
    });

    this.initializeFromResolvedData();
  }

  private initializeFromResolvedData() {
    const quizData: QuizByPinResponse = this.route.snapshot.data['quizData'];

    this.quizAddress.set(quizData.quizAddress);
    this.quizPin.set(quizData.pin);
    this.quizName.set(quizData.quizName);
    this.creatorAddress.set(quizData.creatorAddress);

    const userAddress = this.walletService.address();
    if (userAddress && userAddress !== quizData.creatorAddress) {
      this.socketService.joinQuizQueue(quizData.pin, userAddress);
    }
  }

  async startQuiz() {
    if (!this.isBrowser) return;

    try {
      if (!this.quizPin() || !this.quizAddress() || !this.creatorAddress()) {
        throw new Error('Missing required quiz information');
      }

      const startTime = await this.quizService.startQuiz(
        this.quizAddress(),
        this.creatorAddress(),
        this.quizPin(),
        this.players()
      );

      if (startTime) {
        await this.quizService.savePlayers(this.quizPin(), this.players());
        this.socketService.startQuiz(this.quizPin());
        console.log('Quiz started at and players:', startTime, this.players());
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }
}
