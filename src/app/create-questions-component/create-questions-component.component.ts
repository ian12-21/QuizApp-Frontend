import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';

interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
}

@Component({
  selector: 'app-create-questions-component',
  templateUrl: './create-questions-component.component.html',
  styleUrls: ['./create-questions-component.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule
  ]
})
export class CreateQuestionsComponent {
  quizName: string = '';
  numberOfQuestions: number = 0;
  quizForm: FormGroup | any;
  questions: QuizQuestion[] = [];
  savedQuestions: { [key: number]: boolean } = {};

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) { 
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { quizName: string, numberOfQuestions: number };

    if (state) {
      this.quizName = state.quizName;
      this.numberOfQuestions = state.numberOfQuestions;
      this.initializeQuizForm();
    } else {
      this.router.navigate(['']);
    }
  }

  private initializeQuizForm() {
    this.quizForm = this.fb.group({
      questions: this.fb.array([])
    });

    const questionsArray = this.quizForm.get('questions') as FormArray;
    for (let i = 0; i < this.numberOfQuestions; i++) {
      questionsArray.push(this.createQuestionForm());
    }
  }

  private createQuestionForm(): FormGroup {
    return this.fb.group({
      question: ['', Validators.required],
      answers: this.fb.array([
        this.fb.control(''),
        this.fb.control(''),
        this.fb.control(''),
        this.fb.control('')
      ]),
      correctAnswer: [null, Validators.required]
    });
  }

  getQuestionsFormArray(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  getAnswersFormArray(questionIndex: number): FormArray {
    return (this.getQuestionsFormArray().at(questionIndex) as FormGroup).get('answers') as FormArray;
  }

  hasAnswer(questionIndex: number, answerIndex: number): boolean {
    const answers = this.getAnswersFormArray(questionIndex);
    return answers.at(answerIndex)?.value?.trim() !== '';
  }

  onAnswerInput(questionIndex: number, answerIndex: number) {
    const questionForm = this.getQuestionsFormArray().at(questionIndex) as FormGroup;
    const currentCorrectAnswer = questionForm.get('correctAnswer')?.value;
    const hasCurrentAnswer = this.hasAnswer(questionIndex, answerIndex);

    // If the current correct answer is for an empty input, reset it
    if (currentCorrectAnswer === answerIndex && !hasCurrentAnswer) {
      questionForm.patchValue({ correctAnswer: null });
    }
  }

  saveQuestion(index: number) {
    const questionForm = this.getQuestionsFormArray().at(index) as FormGroup;
    if (questionForm.get('question')?.value.trim() === '') {
      this.snackBar.open('Please enter a question', 'Close', { duration: 3000 });
      return;
    }

    const answers = questionForm.get('answers')?.value.filter((a: string) => a.trim() !== '');
    if (answers.length < 2) {
      this.snackBar.open('Please enter at least 2 answers', 'Close', { duration: 3000 });
      return;
    }

    const correctAnswer = questionForm.get('correctAnswer')?.value;
    const nonEmptyAnswerIndices = questionForm.get('answers')?.value
      .map((a: string, i: number) => a.trim() !== '' ? i : -1)
      .filter((i: number) => i !== -1);

    if (!nonEmptyAnswerIndices.includes(correctAnswer)) {
      this.snackBar.open('Please select a valid correct answer', 'Close', { duration: 3000 });
      return;
    }

    console.log({
      question: questionForm.get('question')?.value,
      answers: answers,
      correctAnswer: correctAnswer
    });
    
    this.questions[index] = {
      question: questionForm.get('question')?.value,
      answers: answers,
      correctAnswer: nonEmptyAnswerIndices.indexOf(correctAnswer)
    };

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
