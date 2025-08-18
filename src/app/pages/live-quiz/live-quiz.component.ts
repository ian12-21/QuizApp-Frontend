import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { WalletService } from '../../../services/wallet.service';
import { QuizService } from '../../../services/quizContracts.service';
import { QuizDataService } from '../../../services/quiz-data.service';
import { SocketService } from '../../../services/socket.service';

interface Question {
  question: string;
  answers: string[];
  correctAnswer: number;
}

export interface UserAnswer {
  quizAddress: string;
  userAddress: string | null;
  questionIndex: number;
  answer: number;
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
  userAnswer: UserAnswer = { quizAddress: '', userAddress: '', questionIndex: 0, answer: -1 };
  isCreator: boolean = false;
  private questionTimer: any;
  private timerInterval: any;
  private readonly QUESTION_DURATION = 20000; // 20 seconds
  isFinished: boolean = false;  
  timerWidth: number = 100; // Start at 100%
  canEndQuiz: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public walletService: WalletService,
    private quizDataService: QuizDataService,
    private socketService: SocketService,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    try {
      this.route.params.subscribe(params => {
        this.quizPin = params['pin'];
        this.initializeQuiz();
      });

      this.socketService.onQuizEnd((data) => {
        this.router.navigate([data.redirectUrl]);
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
      // console.log(quizInfo);
      
      if (quizInfo) {
        this.quizAddress = quizInfo.quizAddress;
        this.quizName = quizInfo.quizName;
        this.creatorAddress = quizInfo.creatorAddress;
        this.questions = quizInfo.questions;
        this.userAnswer.quizAddress = this.quizAddress;
        this.userAnswer.userAddress = this.walletService.address();
        console.log("USER ANSWER 1: ", this.userAnswer);
        
        // Check if current user is the creator
        this.isCreator = this.walletService.address() === quizInfo.creatorAddress;
        console.log("IS CREATOR: ",this.isCreator);
        
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

    console.log("IS FINISHED: ", this.isFinished);
  }

  async submitAnswer() {
    //save to backend every time submit is pressed
    if (this.selectedAnswer !== null) {
      this.userAnswer.answer = this.selectedAnswer;
      this.userAnswer.questionIndex = this.currentQuestionIndex;
    }
    console.log("USER ANSWER 2: ", this.userAnswer);
    await this.quizService.submitAnswer(this.userAnswer);
  }

  //function for submiting all users every answer to backend & contract
  async submitAllUsersAnswers() {
    const response = await this.quizService.submitAllUsersAnswers(this.quizAddress);
    if (response){
      this.canEndQuiz = true
    }
  }

  async endQuiz() {
    if (!this.isCreator) return;

    this.quizDataService.clearQuizData();

    this.socketService.endQuiz(this.quizAddress, this.quizPin);

    try {
      await this.quizService.endQuiz(this.quizAddress, this.creatorAddress, this.quizPin);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }

  /*
  // Replace the submitAllUsersAnswers method in live-quiz.component.ts

  //function for submitting all users' answers to backend & contract with frontend signing
  async submitAllUsersAnswers() {
      try {
          console.log('Preparing to submit all answers with frontend signing...');
          
          // Use the new method that signs on frontend
          const response = await this.quizService.submitAllUsersAnswersWithFrontendSigning(this.quizAddress);
          
          if (response.success) {
              console.log('All answers submitted successfully!');
              console.log('Transaction hash:', response.transactionHash);
              console.log('Winner:', response.winner);
              
              this.canEndQuiz = true;
          } else {
              throw new Error('Failed to submit answers');
          }
      } catch (error) {
          console.error('Error submitting all answers:', error);
          // You might want to show an error message to the user here
          alert('Failed to submit answers. Please try again.');
      }
  }
  
  // Optional: Add a method to use the old backend-only approach
  async submitAllUsersAnswersBackendOnly() {
      try {
          const response = await this.quizService.submitAllUsersAnswers(this.quizAddress);
          if (response.success) {
              this.canEndQuiz = true;
          }
      } catch (error) {
          console.error('Error submitting answers (backend-only):', error);
          alert('Failed to submit answers. Please try again.');
      }
  }
  */
}
