import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { WalletService } from '../../../../core/services/wallet.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  protected readonly authService = inject(AuthService);
  protected readonly walletService = inject(WalletService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly isSaving = signal(false);
  readonly saveMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly copied = signal(false);

  readonly profileForm = this.fb.group({
    nickname: [
      this.authService.userProfile()?.nickname ?? '',
      [
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9_-]*$/),
      ],
    ],
    displayPreference: [
      this.authService.userProfile()?.displayPreference ?? 'address',
    ],
  });

  protected readonly avatarColor = (): string => {
    const address = this.walletService.address();
    if (!address) return '#6b46c1';
    return `#${address.slice(-6)}`;
  };

  protected readonly avatarInitial = (): string => {
    const profile = this.authService.userProfile();
    if (profile?.nickname) return profile.nickname.charAt(0).toUpperCase();
    const address = this.walletService.address();
    return address ? address.slice(2, 3).toUpperCase() : '?';
  };

  async onSave(): Promise<void> {
    if (this.profileForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.saveMessage.set(null);
    this.saveError.set(null);

    try {
      const { nickname, displayPreference } = this.profileForm.value;
      await this.authService.updateProfile({
        nickname: nickname || null,
        displayPreference: displayPreference as 'nickname' | 'address',
      });
      this.saveMessage.set('Profile updated!');
    } catch (error: any) {
      const message = error?.error?.error ?? 'Failed to update profile';
      this.saveError.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  copyAddress(): void {
    const address = this.walletService.address();
    if (address) {
      navigator.clipboard.writeText(address);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
