import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ethers } from 'ethers';
import { environment } from '../../../environments/environment';
import { WalletService } from './wallet.service';
import { UserProfile, LoginResponse, NonceResponse } from '../models/user.model';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly walletService = inject(WalletService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly token = signal<string | null>(null);

  readonly userProfile = signal<UserProfile | null>(null);

  readonly isAuthenticated = computed(() => this.token() !== null);

  readonly displayName = computed(() => {
    const profile = this.userProfile();
    if (!profile) return '';

    if (profile.displayPreference === 'nickname' && profile.nickname) {
      return profile.nickname;
    }
    return `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`;
  });

  getToken(): string | null {
    return this.token();
  }

  async login(): Promise<boolean> {
    if (!this.isBrowser) return false;

    try {
      const address = this.walletService.address();
      if (!address) {
        throw new Error('Wallet not connected');
      }

      const { nonce } = await firstValueFrom(
        this.http.get<NonceResponse>(`${API_URL}/auth/nonce`, {
          params: { address }
        })
      );

      const message = this.buildSignMessage(address, nonce);

      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${API_URL}/auth/login`, {
          address,
          signature,
          message,
        })
      );

      this.token.set(response.token);
      this.userProfile.set(response.user);

      return true;
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error?.code === 'ACTION_REJECTED' || error?.message?.includes('User rejected')) {
        return false;
      }
      throw error;
    }
  }

  logout(): void {
    this.token.set(null);
    this.userProfile.set(null);
    this.walletService.disconnect();
  }

  async fetchProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${API_URL}/user/profile`)
      );
      this.userProfile.set(profile);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      this.logout();
    }
  }

  async updateProfile(data: {
    nickname?: string | null;
    displayPreference?: 'nickname' | 'address';
  }): Promise<UserProfile> {
    const profile = await firstValueFrom(
      this.http.put<UserProfile>(`${API_URL}/user/profile`, data)
    );
    this.userProfile.set(profile);
    return profile;
  }

  private buildSignMessage(address: string, nonce: string): string {
    const timestamp = new Date().toISOString();
    return [
      'Sign in to QuizApp',
      '',
      `Address: ${address}`,
      `Nonce: ${nonce}`,
      `Timestamp: ${timestamp}`,
    ].join('\n');
  }
}
