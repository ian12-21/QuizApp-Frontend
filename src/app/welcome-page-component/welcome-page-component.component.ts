import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-welcome-page-component',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './welcome-page-component.component.html',
    styleUrl: './welcome-page-component.component.scss'
})
export class WelcomePageComponent implements OnInit {

  constructor(public walletService: WalletService,
              @Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit() {
    if(isPlatformBrowser(this.platformId)){
      
    }
  }

  async connectWallet() {
    try {
      await this.walletService.connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }
}