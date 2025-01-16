import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join-quiz-pop-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './join-quiz-pop-up.component.html',
  styleUrls: ['./join-quiz-pop-up.component.scss']
})
export class JoinQuizPopUpComponent {
  joinForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<JoinQuizPopUpComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.joinForm = this.fb.group({
      quizPin: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  onSubmit() {
    if (this.joinForm.valid) {
      this.dialogRef.close(this.joinForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
