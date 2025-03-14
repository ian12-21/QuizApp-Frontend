import { Component, OnInit, OnDestroy, effect, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser, NumberFormatStyle } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { QuizService } from '../../../services/quizContracts.service';
import { WalletService } from '../../../services/wallet.service';
import { QuizDataService } from '../../../services/quiz-data.service';

@Component({
  selector: 'app-quiz-queue',
  templateUrl: './quiz-queue.component.html',
  styleUrls: ['./quiz-queue.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatButtonModule],
})
export class QuizQueueComponent implements OnInit, OnDestroy {
  quizAddress: string = '';
  quizName: string = '';
  quizPin: string = '';
  players: string[] = [];
  private refreshInterval: any;
  creatorAddress: string = '';
  quizData: any;
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public walletService: WalletService,
    private quizDataService: QuizDataService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
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
        this.quizPin = routePin;
        this.loadQuizByPin(routePin);
      } else if (activeQuiz) {
        this.quizPin = activeQuiz.pin;
        this.loadQuizByPin(activeQuiz.pin);
      } else {
        this.router.navigate(['/']);
      }
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
        this.quizAddress = quizInfo.quizAddress;
        this.creatorAddress = quizInfo.creatorAddress;
        this.quizName = quizInfo.quizName;

        this.quizData = quizInfo;

        this.startPlayerRefresh();

        const userAddress = this.walletService.address();
        if (this.creatorAddress !== userAddress && userAddress) {
          this.players.push(userAddress);
        }
      } else {
        //this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error loading quiz by pin:', error);
      //this.router.navigate(['/']);
    }
  }

  private startPlayerRefresh() {
    if (!this.isBrowser || !this.quizPin) return;
    
    this.refreshPlayers();

    // Refresh player list every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshPlayers();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async refreshPlayers() {
    if (!this.isBrowser || !this.quizPin) return;
    
    try {
      if (this.quizData && Array.isArray(this.quizData.playerAddresses)) {
        const uniquePlayers = new Set([
          ...this.players,
          ...this.quizData.playerAddresses,
        ]);
        this.players = Array.from(uniquePlayers);
      }
    } catch (error) {
      console.error('Error refreshing players:', error);
    }
  }


  //we should create instance of quiz in the database 
  async startQuiz() {
    if (!this.isBrowser) return;
    
    try {
      if (!this.quizPin || !this.quizAddress || !this.creatorAddress) {
        throw new Error('Missing required quiz information');
      }

      // const startTime = await this.quizService.startQuiz(
      //   this.quizAddress,
      //   this.creatorAddress,
      //   this.quizPin,
      // );

      console.log('Quiz started successfully');
      // Navigate to active quiz page
      this.router.navigate(['/active-quiz/', this.quizPin], {
        state: {
          // startTime
        },
      });
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }
}
