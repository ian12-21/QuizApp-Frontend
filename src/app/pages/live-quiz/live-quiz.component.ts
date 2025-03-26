import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { WalletService } from '../../../services/wallet.service';

// Import the service with its actual export name
import { QuizService } from '../../../services/quizContracts.service';

interface Question {
  question: string;
  answers: string[];
  correctAnswer: number;
}

interface UserAnswers {
  quizAddress: string;
  answers: number[];
}

@Component({
  selector: 'app-live-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatDialogModule
  ],
  templateUrl: './live-quiz.component.html',
  styleUrls: ['./live-quiz.component.scss']
})
export class LiveQuizComponent implements OnInit, OnDestroy {
  quizPin: string = '';
  quizAddress: string = '';
  quizName: string = '';
  creatorAddress: string = '';
  questions: Question[] = [];
  currentQuestion: Question | null = null;
  currentQuestionIndex: number = 0;
  selectedAnswer: number | null = null;
  userAnswers: UserAnswers = { quizAddress: '', answers: [] };
  isCreator: boolean = false;
  private questionTimer: any;
  private timerInterval: any;
  private readonly QUESTION_DURATION = 20000; // 20 seconds
  isFinished: boolean = false;  
  timerWidth: number = 100; // Start at 100%

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public walletService: WalletService,
    private dialog: MatDialog
  ) {
    this.userAnswers.quizAddress = this.walletService.address() || '';
  }

  async ngOnInit() {
    try {
      this.route.params.subscribe(params => {
        this.quizPin = params['pin'];
        this.initializeQuiz();
      });
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  private clearTimers() {
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private async initializeQuiz() {
    try {
      // Fetch quiz data here
      const quizInfo = await this.quizService.getQuizByPin(this.quizPin);
      console.log(quizInfo);
      
      if (quizInfo) {
        this.quizAddress = quizInfo.quizAddress;
        this.quizName = quizInfo.quizName;
        this.creatorAddress = quizInfo.creatorAddress;
        this.questions = quizInfo.questions;
        this.userAnswers.quizAddress = this.quizAddress;
        this.userAnswers.answers = new Array(this.questions.length).fill(-1);
        
        // Check if current user is the creator
        this.isCreator = this.walletService.address() === quizInfo.creatorAddress;
        
        if (this.questions.length > 0) {
          this.currentQuestion = this.questions[0];
          this.currentQuestionIndex = 0;
          
          // Start the timer for the first question
          this.startTimers();
        }
      }
    } catch (error) {
      console.error('Error initializing quiz:', error);
      this.router.navigate(['/']);
    }
  }

  private startTimers() {
    // Reset timer width to 100%
    this.timerWidth = 100;
    
    // Clear any existing timers
    this.clearTimers();
    
    // Create a timer that updates the width every 200ms
    const updateFrequency = 200; // milliseconds
    const steps = this.QUESTION_DURATION / updateFrequency;
    const decrementPerStep = 100 / steps;
    
    this.timerInterval = setInterval(() => {
      this.timerWidth = Math.max(0, this.timerWidth - decrementPerStep);
    }, updateFrequency);
    
    // Set the question timer to move to the next question
    this.questionTimer = setTimeout(() => {
      // Clear the timer interval
      clearInterval(this.timerInterval);
      
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
        this.currentQuestion = this.questions[this.currentQuestionIndex];
        this.selectedAnswer = null;
        
        // Start the timer for the next question
        this.startTimers();
      } else {
        // Last question finished
        if (this.isCreator) {
          this.isFinished = true;
        }
      }
    }, this.QUESTION_DURATION);
  }

  submitAnswer() {
    if (this.selectedAnswer !== null) {
      this.userAnswers.answers[this.currentQuestionIndex] = this.selectedAnswer;
    }
  }

  async endQuiz() {
    if (!this.isCreator) return;

    try {
      //await this.quizService.endQuiz(this.quizAddress);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }
}
