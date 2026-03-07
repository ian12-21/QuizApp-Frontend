import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-create-quiz-dialog',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './create-quiz-dialog.component.html',
  styleUrls: ['./create-quiz-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateQuizDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CreateQuizDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly quizForm = this.fb.group({
    quizName: ['', [Validators.required, this.notOnlyNumbersValidator]],
    numberOfQuestions: ['', [Validators.required, Validators.min(1), Validators.max(50), this.onlyNumbersValidator]]
  });

  // Custom validator to ensure input is not only numbers
  notOnlyNumbersValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    if (!value) {
      return null; // Let required validator handle empty values
    }
    
    // Check if the value consists only of numbers
    if (/^\d+$/.test(value)) {
      return { onlyNumbers: true };
    }
    
    return null;
  }

  // Custom validator to ensure input contains only numbers
  onlyNumbersValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    if (!value) return null; // Let required validator handle empty values
    
    // Check if the value consists only of numbers
    if (!/^\d+$/.test(value)) return { notNumber: true };
    
    return null;
  }

  onSubmit() {
    if (this.quizForm.valid) {
      // Convert numberOfQuestions to a number before submitting
      const formValue = {
        ...this.quizForm.value,
        numberOfQuestions: Number(this.quizForm.value.numberOfQuestions)
      };
      this.dialogRef.close(formValue);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
