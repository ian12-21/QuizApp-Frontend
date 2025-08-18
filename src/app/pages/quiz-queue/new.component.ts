import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { QuizService } from '../../../services/quizContracts.service';
import { WalletService } from '../../../services/wallet.service';
import { QuizDataService } from '../../../services/quiz-data.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quiz-queue',
  templateUrl: './quiz-queue.component.html',
  styleUrls: ['./quiz-queue.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatButtonModule],
})
export class QuizQueueComponent implements OnInit, OnDestroy {
  quizAddress = signal('');
  quizName = signal('');
  quizPin = signal('');
  players = signal<string[]>([]);
  creatorAddress = signal('');
  quizData = signal<any>(null);
  private isBrowser: boolean;
  private subscriptions: Subscription[] = [];

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

    // Use effect to react to players changes
    effect(() => {
      if (this.isBrowser) {
        try {
          this.players.set(this.socketService.players());        
        } catch (error) {
          console.error('Error updating players:', error);
          this.players.set([]);
        }
      }
    });
  }

  async ngOnInit() {
    // Skip initialization on server-side
    if (!this.isBrowser) {
      return;
    }

    try {
      const routePin = this.route.snapshot.params['pin'];
      const activeQuiz = this.quizDataService.getActiveQuiz();

      if (routePin) {
        this.quizPin.set(routePin);
        await this.loadQuizByPin(routePin);
      } else if (activeQuiz) {
        this.quizPin.set(activeQuiz.pin);
        await this.loadQuizByPin(activeQuiz.pin);
      } else {
        this.router.navigate(['/']);
        return;
      }

      // Setup socket listeners BEFORE joining
      this.setupSocketListeners();

      // Wait a bit to ensure socket is connected, then join
      const userAddress = this.walletService.address();
      if (userAddress) {
        if (userAddress === this.creatorAddress()) {
          // Creator creates the room
          await this.socketService.createQuizRoom(this.quizPin(), userAddress);
        } else {
          // Player joins the queue
          await this.socketService.joinQuizQueue(this.quizPin(), userAddress);
        }
      }

    } catch (error) {
      console.error('Error initializing quiz queue:', error);
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSocketListeners(): void {
    // Setup quiz start listener
    this.socketService.onQuizStart((data) => {
      console.log('Quiz started, navigating to:', data.redirectUrl);
      this.router.navigate([data.redirectUrl]);
    });
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
        console.log('Quiz loaded:', quizInfo);
      } else {
        console.error('Quiz not found for pin:', pin);
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error loading quiz by pin:', error);
      this.router.navigate(['/']);
    }
  }

  async startQuiz() {
    if (!this.isBrowser) return;

    try {
      if (!this.quizPin() || !this.quizAddress() || !this.creatorAddress()) {
        throw new Error('Missing required quiz information');
      }

      console.log('Starting quiz with players:', this.players());
      
      // Save players to backend
      await this.quizService.savePlayers(this.quizPin(), this.players());
      
      // Start quiz on blockchain/backend
      await this.quizService.startQuiz(this.quizAddress(), this.creatorAddress(), this.quizPin());
      
      // Emit start event via socket
      await this.socketService.startQuiz(this.quizPin());
      
      console.log('Quiz start event emitted');
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }

  // Helper method to check if current user is creator
  isCreator(): boolean {
    return this.walletService.address() === this.creatorAddress();
  }
}
