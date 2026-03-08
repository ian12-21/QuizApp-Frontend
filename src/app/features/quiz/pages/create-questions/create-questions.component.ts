import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WalletService } from '../../../../core/services/wallet.service';
import { QuizService } from '../../../../core/services/quiz-contracts.service';
import { QuizDataService } from '../../../../core/services/quiz-data.service';
import { SocketService } from '../../../../core/services/socket.service';
import { QuizQuestion } from '../../../../core/models/quiz.models';

@Component({
  selector: 'app-create-questions',
  templateUrl: './create-questions.component.html',
  styleUrls: ['./create-questions.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateQuestionsComponent {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly walletService = inject(WalletService);
  private readonly quizService = inject(QuizService);
  private readonly quizDataService = inject(QuizDataService);
  private readonly socketService = inject(SocketService);
  private readonly fb = inject(FormBuilder);

  readonly quizName = signal('');
  readonly numberOfQuestions = signal(0);
  readonly ownerAddress = signal('');
  // Track which questions have been saved using a signal that maps question index to saved status
  readonly savedQuestions = signal<Record<number, boolean>>({});

  private questions: QuizQuestion[] = [];

  readonly questionsForm: FormArray;

  constructor() {
    const quizData = this.quizDataService.getQuizData();

    //checking if user is owner happens in auth-guard
    if (quizData) {
      this.quizName.set(quizData.quizName);
      this.numberOfQuestions.set(quizData.numberOfQuestions);
      this.ownerAddress.set(quizData.ownerAddress);
    }

    this.questionsForm = this.fb.array(
      Array.from({ length: this.numberOfQuestions() }, () =>
        this.fb.group({
          question: [''],
          answer0: [''],
          answer1: [''],
          answer2: [''],
          answer3: [''],
          correctAnswer: [null as number | null],
        })
      )
    );
  }

  // Helper to get the FormGroup for a specific question index
  getQuestionGroup(index: number): FormGroup {
    return this.questionsForm.at(index) as FormGroup;
  }

  // returns true if the specified answer for the question index is non-empty
  hasAnswer(questionIndex: number, answerIndex: number): boolean {
    const group = this.getQuestionGroup(questionIndex);
    const value = group.get(`answer${answerIndex}`)?.value;
    return value?.trim() !== '';
  }

  //Resets the correct answer for a question if the currently selected correct answer becomes empty
  onAnswerInput(questionIndex: number, answerIndex: number) {
    const group = this.getQuestionGroup(questionIndex);
    const correctAnswer = group.get('correctAnswer')?.value;
    if (correctAnswer === answerIndex && !this.hasAnswer(questionIndex, answerIndex)) {
      group.patchValue({ correctAnswer: null });
    }
  }

  saveQuestion(index: number) {
    const group = this.getQuestionGroup(index);
    const questionText = group.get('question')?.value?.trim();

    if (!questionText) {
      this.snackBar.open('Please enter a question', 'Close', { duration: 3000 });
      return;
    }

    const answers = [
      group.get('answer0')?.value?.trim() || '',
      group.get('answer1')?.value?.trim() || '',
      group.get('answer2')?.value?.trim() || '',
      group.get('answer3')?.value?.trim() || '',
    ];
    // Filter out empty answers and ensure there are at least 2
    const nonEmptyAnswers = answers.filter(a => a !== '');
    if (nonEmptyAnswers.length < 2) {
      this.snackBar.open('Please enter at least 2 answers', 'Close', { duration: 3000 });
      return;
    }
    // Ensure the correct answer is still valid after filtering out empty answers
    const correctAnswer = group.get('correctAnswer')?.value;
    if (correctAnswer === null || !this.hasAnswer(index, correctAnswer)) {
      this.snackBar.open('Please select a valid correct answer', 'Close', { duration: 3000 });
      return;
    }
    // Map the correct answer index to the new index in the non-empty answers array
    const nonEmptyAnswerIndices = answers
      .map((a, i) => ({ answer: a, index: i }))
      .filter(a => a.answer !== '');

    // Save the question data
    this.questions[index] = {
      question: questionText,
      answers: nonEmptyAnswers,
      correctAnswer: nonEmptyAnswerIndices.findIndex(a => a.index === correctAnswer)
    };

    this.savedQuestions.update(saved => ({ ...saved, [index]: true }));
    this.snackBar.open('Question saved!', 'Close', { duration: 2000 });
  }

  // Helper to check if a question is saved based on the savedQuestions signal
  isQuestionSaved(index: number): boolean {
    return this.savedQuestions()[index] || false;
  }

  async onSubmit() {
    if (!this.walletService.isConnected()) {
      this.snackBar.open('Wallet not connected', 'Close', { duration: 3000 });
      return;
    }

    // Check if all questions are saved before allowing submission
    const unsavedQuestions = Array.from({ length: this.numberOfQuestions() }, (_, i) => i)
      .filter(i => !this.isQuestionSaved(i));
    if (unsavedQuestions.length > 0) {
      this.snackBar.open(`Please save questions: ${unsavedQuestions.map(i => i + 1).join(', ')}`, 'Close', { duration: 5000 });
      return;
    }

    try {
      if (!this.walletService.address()) {
        throw new Error('Wallet not connected');
      }

      const result = await this.quizService.createQuiz(
        this.ownerAddress(),
        this.quizName(),
        this.questions
      );
      // const result: { quizAddress: string, pin: string } = { quizAddress: '0x92d0De7d596eAA1255b9a3634C3cB2901997Ca6E', pin: '598205' };
      this.socketService.createQuizRoom(result.pin, this.ownerAddress());
      // Store quiz info in the service for access in quiz-queue
      this.quizDataService.setActiveQuiz({
        pin: result.pin,
        quizName: this.quizName(),
        quizAddress: result.quizAddress,
        creatorAddress: this.ownerAddress(),
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
