import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WalletService } from '../../../services/wallet.service';
import { QuizService } from '../../../services/quizContracts.service';
import { QuizDataService } from '../../../services/quiz-data.service';
import { SocketService } from '../../../services/socket.service';

interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
}

interface QuestionForm {
  question: string;
  answers: string[];
  correctAnswer: number | null;
  isValid?: boolean;
}

@Component({
  selector: 'app-create-questions-component',
  templateUrl: './create-questions-component.component.html',
  styleUrls: ['./create-questions-component.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule
  ]
})
export class CreateQuestionsComponent implements OnInit {
  quizName: string = '';
  numberOfQuestions: number = 0;
  questions: QuizQuestion[] = [];
  questionForms: QuestionForm[] = [];
  savedQuestions: { [key: number]: boolean } = {};

  ownerAddress: string = '';

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private walletService: WalletService,
    private quizService: QuizService,
    private quizDataService: QuizDataService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    // try to get data from the service
    const quizData = this.quizDataService.getQuizData();
    
    //checking if user is owner happens in auth-guard
    if (quizData) {
      // Use data from the service
      this.quizName = quizData.quizName;
      this.numberOfQuestions = quizData.numberOfQuestions;
      this.ownerAddress = quizData.ownerAddress;
      this.initializeQuestions();
    }  
  }

  private initializeQuestions() {
    for (let i = 0; i < this.numberOfQuestions; i++) {
      this.questionForms.push({
        question: '',
        answers: ['', '', '', ''],
        correctAnswer: null
      });
    }
  }

  //return false if answer is empty
  //returns true if answer is not empty
  hasAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.questionForms[questionIndex]?.answers[answerIndex].trim() !== '';
  }

  //Resets the correct answer for a question if the currently selected correct answer becomes empty
  onAnswerInput(questionIndex: number, answerIndex: number) {
    const question = this.questionForms[questionIndex];
    if (question.correctAnswer === answerIndex && !this.hasAnswer(questionIndex, answerIndex)) {
      question.correctAnswer = null;
    }
  }

  saveQuestion(index: number) {
    const questionForm = this.questionForms[index];
    
    if (!questionForm.question.trim()) {
      this.snackBar.open('Please enter a question', 'Close', { duration: 3000 });
      return;
    }

    const nonEmptyAnswers = questionForm.answers.filter(a => a.trim() !== '');
    if (nonEmptyAnswers.length < 2) {
      this.snackBar.open('Please enter at least 2 answers', 'Close', { duration: 3000 });
      return;
    }

    if (questionForm.correctAnswer === null || !this.hasAnswer(index, questionForm.correctAnswer)) {
      this.snackBar.open('Please select a valid correct answer', 'Close', { duration: 3000 });
      return;
    }
    //The result is an array of objects where each object represents a non-empty 
    //answer and its index in the original array.
    const nonEmptyAnswerIndices = questionForm.answers
      .map((a, i) => ({ answer: a.trim(), index: i }))
      .filter(a => a.answer !== '');

    this.questions[index] = {
      question: questionForm.question.trim(),
      answers: nonEmptyAnswers,
      correctAnswer: nonEmptyAnswerIndices.findIndex(a => a.index === questionForm.correctAnswer)
    };

    this.savedQuestions[index] = true;
    this.snackBar.open('Question saved!', 'Close', { duration: 2000 });
  }
  
  isQuestionSaved(index: number): boolean {
    return this.savedQuestions[index] || false;
  }

  async onSubmit() {
    if(!this.walletService.isConnected()){
      this.snackBar.open('Wallet not connected', 'Close', { duration: 3000 });
    }

    const unsavedQuestions = Array.from({ length: this.numberOfQuestions }, (_, i) => i)
      .filter(i => !this.isQuestionSaved(i));

    if (unsavedQuestions.length > 0) {
      this.snackBar.open(`Please save questions: ${unsavedQuestions.map(i => i + 1).join(', ')}`, 'Close', { duration: 5000 });
      return;
    }

    try {
      if (!this.walletService.address()) {
        throw new Error('Wallet not connected');
      }

      //return quiz address and pin
      // const result = await this.quizService.createQuiz(
      //   this.ownerAddress,
      //   this.quizName,
      //   this.questions
      // );
      const result: { quizAddress: string, pin: string } = { quizAddress: '0x92d0De7d596eAA1255b9a3634C3cB2901997Ca6E', pin: '598205' };
      this.socketService.createQuizRoom(result.pin, this.ownerAddress);
      // Store quiz info in the service for access in quiz-queue
      this.quizDataService.setActiveQuiz({  
        pin: result.pin,
        quizName: this.quizName,
        quizAddress: result.quizAddress,
        creatorAddress: this.ownerAddress,
        isCreator: true
      });

      this.snackBar.open(`Quiz created! PIN: ${result.pin}`, 'Close', { duration: 5000 });
      this.router.navigate(['/quiz-queue', result.quizAddress, result.pin]);
    } catch (error) {
      console.error('Error creating quiz:', error);
      this.snackBar.open('Error creating quiz', 'Close', { duration: 3000 });
    }
  }


}