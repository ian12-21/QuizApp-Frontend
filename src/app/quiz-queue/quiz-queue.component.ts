import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { QuizService } from '../../services/quizContracts.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-quiz-queue',
  templateUrl: './quiz-queue.component.html',
  styleUrls: ['./quiz-queue.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatButtonModule]
})
export class QuizQueueComponent implements OnInit, OnDestroy {
  quizAddress: string = '';
  quizName: string = '';
  quizPin: string = '';
  players: string[] = [];
  private refreshInterval: any;
  creatorAddress: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public walletService: WalletService
  ) {}

  async ngOnInit() {
    // Subscribe to route params
    this.route.params.subscribe(async params => {
      try {
        console.log('Route params:', params);
        const pin = params['pin'];
        console.log('PIN from params:', pin);
        
        if (!pin) {
          console.error('No PIN provided in route');
          this.router.navigate(['/']);
          return;
        }

        this.quizPin = pin;
        const quizInfo = await this.quizService.getQuizByPin(this.quizPin);
        console.log('Quiz info:', quizInfo);
            
        if (quizInfo) {
          // this.quizPin = quizInfo.pin;
          this.creatorAddress = quizInfo.creatorAddress;
          this.quizAddress = quizInfo.quizAddress;
          this.quizName = quizInfo.quizName;
          // this.players = quizInfo.playerAddresses;
          
          // Start refreshing players only after we have the quiz info
          this.startPlayerRefresh();
          
          console.log('Final component state:', {
            quizPin: this.quizPin,
            creatorAddress: this.creatorAddress,
            quizAddress: this.quizAddress,
            quizName: this.quizName,
            players: this.players,
          });
        } else {
          console.error('Failed to get quiz info');
          this.router.navigate(['/']);
        }
      } catch (error) {
        console.error('Error initializing quiz queue:', error);
        this.router.navigate(['/']);
      }
    });
  }

  private startPlayerRefresh() {
    if (this.quizPin) {
      this.refreshPlayers();
      
      // Refresh player list every 5 seconds
      this.refreshInterval = setInterval(() => {
        this.refreshPlayers();
      }, 5000);
    }
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async refreshPlayers() {
    try {
      if (!this.quizPin) {
        return;
      }
      const quizData = await this.quizService.getQuizByPin(this.quizPin);
      if (quizData && Array.isArray(quizData.playerAddresses)) {
        this.players = quizData.playerAddresses;
      }
    } catch (error) {
      console.error('Error refreshing players:', error);
    }
  }

  async startQuiz() {
    try {
      if (!this.quizPin || !this.quizAddress || !this.creatorAddress) {
        throw new Error('Missing required quiz information');
      }
      
      const startTime = await this.quizService.startQuiz(
        this.quizAddress,
        this.creatorAddress,
        this.quizPin,
      );

      console.log('Quiz started successfully');
      // Navigate to active quiz page
      this.router.navigate(['/active-quiz/', this.quizPin], {
        state: {
          startTime
        }
      });
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }
}
