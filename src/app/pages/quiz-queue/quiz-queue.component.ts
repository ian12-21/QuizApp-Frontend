import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public walletService: WalletService,
    private quizDataService: QuizDataService
  ) {}

  ngOnInit() {
    try {
      const routePin = this.route.snapshot.params['pin'];
      const activeQuiz = this.quizDataService.getActiveQuiz();

      if(routePin){
        this.quizPin = routePin;
        this.loadQuizByPin(routePin);
      }else if(activeQuiz){
        this.quizPin = activeQuiz.pin;
        this.loadQuizByPin(activeQuiz.pin);
      }else{
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error initializing quiz queue:', error);
      // this.router.navigate(['/']);
    }
  }

  private async loadQuizByPin(pin: string){
    try{
      const quizInfo = await this.quizService.getQuizByPin(pin);
      if(quizInfo){
        this.quizAddress = quizInfo.quizAddress;
        this.creatorAddress = quizInfo.creatorAddress;
        this.quizName = quizInfo.quizName;

        this.quizData = quizInfo;

        this.quizDataService.setActiveQuiz({
          pin: pin,
          quizName: quizInfo.quizName,
          creatorAddress: quizInfo.creatorAddress,
          quizAddress: quizInfo.quizAddress,
          isCreator: this.creatorAddress === this.walletService.address()
        });

        this.startPlayerRefresh();

        if(this.creatorAddress !== this.walletService.address()){
          // The non-null assertion operator (!) tells TypeScript that address() will not be null
          // This allows us to push the address without TypeScript warning about possible null values
          this.players.push(this.walletService.address()!);
        }
      }else{
        //this.router.navigate(['/']);
      }
    }catch(error){
      console.error('Error loading quiz by pin:', error);
      //this.router.navigate(['/']);
    }
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

  async startQuiz() {
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
