import { Component, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WalletService } from '../../services/wallet.service';

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
export class CreateQuestionsComponent {
  quizName: string = '';
  numberOfQuestions: number = 0;
  questions: QuizQuestion[] = [];
  questionForms: QuestionForm[] = [];
  savedQuestions: { [key: number]: boolean } = {};

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    public walletService: WalletService
  ) { 
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { quizName: string, numberOfQuestions: number };

    if (state && this.walletService.isConnected()) {
      this.quizName = state.quizName;
      this.numberOfQuestions = state.numberOfQuestions;
      this.initializeQuestions();
    } else {
      this.router.navigate(['']);
    }

    effect(() => {
      if (!this.walletService.isConnected()) {
        this.router.navigate(['']);
      }
    });
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

  hasAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.questionForms[questionIndex]?.answers[answerIndex]?.trim() !== '';
  }

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

    const nonEmptyAnswerIndices = questionForm.answers
      .map((a, i) => ({ answer: a.trim(), index: i }))
      .filter(a => a.answer !== '');

    this.questions[index] = {
      question: questionForm.question.trim(),
      answers: nonEmptyAnswers,
      correctAnswer: nonEmptyAnswerIndices.findIndex(a => a.index === questionForm.correctAnswer)
    };

    console.log('Question saved:', this.questions[index]);

    this.savedQuestions[index] = true;
    this.snackBar.open('Question saved!', 'Close', { duration: 2000 });
  }

  isQuestionSaved(index: number): boolean {
    return this.savedQuestions[index] || false;
  }

  onSubmit() {
    const unsavedQuestions = Array.from({ length: this.numberOfQuestions }, (_, i) => i)
      .filter(i => !this.isQuestionSaved(i));

    if (unsavedQuestions.length > 0) {
      this.snackBar.open(`Please save questions: ${unsavedQuestions.map(i => i + 1).join(', ')}`, 'Close', { duration: 5000 });
      return;
    }

    console.log('Quiz Data:', {
      name: this.quizName,
      questions: this.questions
    });
    // Here you can call your smart contract function
  }
}