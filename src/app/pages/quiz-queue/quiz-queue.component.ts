import { Component, OnInit, PLATFORM_ID, Inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { QuizService } from '../../../services/quizContracts.service';
import { WalletService } from '../../../services/wallet.service';
import { QuizDataService } from '../../../services/quiz-data.service';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-quiz-queue',
  templateUrl: './quiz-queue.component.html',
  styleUrls: ['./quiz-queue.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatButtonModule],
})
export class QuizQueueComponent implements OnInit {
  quizAddress = signal('');
  quizName = signal('');
  quizPin = signal('');
  players = signal<string[]>([]);
  creatorAddress = signal('');
  quizData = signal<any>(null);
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public walletService: WalletService,
    private quizDataService: QuizDataService,
    private socketService: SocketService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Use effect to react to players changes with extensive logging
    effect(() => {
      if (this.isBrowser) {
        try {
          this.players.set(this.socketService.players());        
        } catch (error) {
          console.error('Error initializing players:', error);
          this.players.set([]);
        }
      }
    });
  }

  ngOnInit() {
    // Skip initialization on server-side to avoid sessionStorage errors
    if (!this.isBrowser) {
      return;
    }

    try {
      const routePin = this.route.snapshot.params['pin'];
      const activeQuiz = this.quizDataService.getActiveQuiz();

      if (routePin) {
        this.quizPin.set(routePin);
        this.loadQuizByPin(routePin);
      } else if (activeQuiz) {
        this.quizPin.set(activeQuiz.pin);
        this.loadQuizByPin(activeQuiz.pin);
      } else {
        this.router.navigate(['/']);
      }

      const userAddress = this.walletService.address();
      if(userAddress && userAddress !== this.creatorAddress()){
        this.socketService.joinQuizQueue(this.quizPin(), userAddress);
      }

      this.socketService.onQuizStart((data) => {
        this.router.navigate([data.redirectUrl]);
      });

    } catch (error) {
      console.error('Error initializing quiz queue:', error);
      this.router.navigate(['/']);
    }
  }

  private async loadQuizByPin(pin: string) {
    if (!this.isBrowser) return;
    
    try {
      const quizInfo = await this.quizService.getQuizByPin(pin);
      if (quizInfo) {
        this.quizAddress.set(quizInfo.quizAddress);
        this.creatorAddress.set(quizInfo.creatorAddress);
        this.quizName.set(quizInfo.quizName);
        this.quizData.set(quizInfo);
      } else {
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error loading quiz by pin:', error);
      this.router.navigate(['/']);
    }
  }

  async startQuiz() {
    if (!this.isBrowser) return;

    await this.quizService.savePlayers(this.quizPin(), this.players());
    
    try {
      if (!this.quizPin() || !this.quizAddress() || !this.creatorAddress()) {
        throw new Error('Missing required quiz information');
      }

      this.socketService.startQuiz(this.quizPin());
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }
}