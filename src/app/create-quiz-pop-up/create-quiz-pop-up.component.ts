import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-quiz-pop-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './create-quiz-pop-up.component.html',
  styleUrls: ['./create-quiz-pop-up.component.scss']
})
export class CreateQuizPopUpComponent {
  quizForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<CreateQuizPopUpComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.quizForm = this.fb.group({
      quizName: ['', [Validators.required]],
      numberOfQuestions: ['', [Validators.required, Validators.min(1), Validators.max(20)]]
    });
  }

  onSubmit() {
    if (this.quizForm.valid) {
      this.dialogRef.close(this.quizForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
