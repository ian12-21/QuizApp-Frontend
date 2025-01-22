import { Component, OnInit, OnDestroy } from '@angular/core';
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
  ) {
    // Get navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      quizAddress: string;
      address: string;
      pin: string;
      quizName: string;
    };

    // If we have state and wallet is connected, use it
    if (state && this.walletService.isConnected()) {
      this.quizAddress = state.quizAddress;
      this.creatorAddress = state.address;
      this.quizPin = state.pin;
      this.quizName = state.quizName;
    }
  }

  ngOnInit() {
    // If we don't have state from navigation, try to get from route params
    this.route.params.subscribe(async params => {
      try {
        const address = params['address'];
        if (!address) {
          console.error('No quiz address provided');
          return;
        }

        this.quizAddress = address;
        
        if (!this.quizPin) {
          const quizInfo = await this.quizService.getQuizByAddress(address);
          if (quizInfo) {
            this.quizPin = quizInfo.pin;
            this.players = quizInfo.playerAddresses || [];
            
            // Start refreshing players only after we have the quiz info
            this.startPlayerRefresh();
          }
        }
      } catch (error) {
        console.error('Error initializing quiz queue:', error);
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
      
      await this.quizService.startQuiz(
        this.quizAddress,
        this.creatorAddress,
        this.quizPin,
        this.players
      );
      console.log('Quiz started successfully');
      // Navigate to active quiz page
      this.router.navigate(['/active-quiz'], {
        state: {
          quizAddress: this.quizAddress,
          pin: this.quizPin,
          name: this.quizName
        }
      });
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }
}
