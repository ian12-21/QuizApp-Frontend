import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome-page-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome-page-component.component.html',
  styleUrl: './welcome-page-component.component.scss'
})
// export class WelcomePageComponentComponent {
// //here should be a container with info and 2 buttons: connect wallet and join quiz
// //when buttn is presed a popup appears with the wallet connection or quiz join
// //the popup should be a separate component, use angular materials
// }

export class WelcomePageComponent implements OnInit {
  isConnected: boolean = false;
  shortenedAddress: string = '';
  private subscriptions: Subscription[] = [];

  constructor(private walletService: WalletService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.walletService.isConnected$.subscribe(
        connected => this.isConnected = connected
      ),
      this.walletService.account$.subscribe(account => {
        this.shortenedAddress = account ? 
          this.walletService.shortenAddress(account) : '';
      })
    );
  }



  async connectWallet() {
    try {
      await this.walletService.connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }
}