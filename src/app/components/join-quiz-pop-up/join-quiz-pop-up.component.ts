import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { QuizService } from '../../../services/quizContracts.service';

@Component({
  selector: 'app-join-quiz-pop-up',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './join-quiz-pop-up.component.html',
  styleUrls: ['./join-quiz-pop-up.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinQuizPopUpComponent {
  private readonly dialogRef = inject(MatDialogRef<JoinQuizPopUpComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly quizService = inject(QuizService);
  private readonly snackBar = inject(MatSnackBar);

  readonly joinForm = this.fb.group({
    quizPin: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  async onSubmit() {
    if (this.joinForm.valid) {
      try {
        const result = await this.quizService.getQuizByPin(this.joinForm.value.quizPin!);
        this.dialogRef.close({
          ...this.joinForm.value,
          quizAddress: result.quizAddress
        });
      } catch (error) {
        console.error('Error joining quiz:', error);
        this.snackBar.open('Invalid PIN. Please try again.', 'Close', { duration: 3000 });
      }
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
