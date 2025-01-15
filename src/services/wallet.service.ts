import { Injectable, signal, computed, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const isNotNull = <T>(value: T | null): value is NonNullable<T> => value !== null;

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  // Signals for reactive state management
  readonly address = signal<string | null>(null);
  readonly chainId = signal<number | null>(null);
  readonly isConnecting = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private readonly isBrowser: boolean;

  // Computed signals
  readonly isConnected = computed(() => isNotNull(this.address()));
  readonly shortAddress = computed(() => {
    const addr = this.address();
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  });

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if(this.isBrowser){
      this.initializeWalletListeners();
      this.restoreConnectionState();
    }
  }

  private get ethereum(): any {
    return this.isBrowser ? window.ethereum : null;
  }

  private isMetaMaskInstalled(): boolean {
    return this.isBrowser && typeof window.ethereum !== 'undefined';
  }

  private initializeWalletListeners(): void {
    if (this.isMetaMaskInstalled()) {
      // Handle account changes
      this.ethereum.on('accountsChanged', (accounts: string[]) => {
        this.address.set(accounts[0] || null);
        if (!accounts[0]) {
          this.handleDisconnect();
        } else {
          this.saveConnectionState();
        }
      });

      // Handle chain changes
      this.ethereum.on('chainChanged', (chainId: string) => {
        this.chainId.set(parseInt(chainId, 16));
        this.saveConnectionState();
      });

      // Handle disconnect
      this.ethereum.on('disconnect', () => {
        this.handleDisconnect();
      });
    }
  }

  async connect(): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) {
      this.error.set('No wallet found. Please install MetaMask.');
      return false;
    }

    try {
      this.isConnecting.set(true);
      this.error.set(null);

      // Request account access
      const accounts = await this.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      // Get current chain ID
      const tmpChainId = await this.ethereum.request({ 
        method: 'eth_chainId' 
      });

      this.address.set(accounts[0]);
      //converts chainId(which is in hex) to number
      this.chainId.set(parseInt(tmpChainId, 16));
      this.saveConnectionState();

      return true;
    } catch (error) {
      this.error.set(this.getErrorMessage(error));
      return false;
    } finally {
      this.isConnecting.set(false);
    }
  }

  async disconnect(): Promise<void> {
    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    this.address.set(null);
    this.chainId.set(null);
    this.error.set(null);
    this.clearConnectionState();
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message.includes('User rejected') 
        ? 'Connection rejected by user.'
        : error.message;
    }
    return 'An unknown error occurred.';
  }

  async checkExistingConnection(): Promise<void> {
    if (this.isMetaMaskInstalled()) {
      try {
        // Get currently connected accounts
        const accounts = await this.ethereum.request({ 
          method: 'eth_accounts'  // Note: This doesn't prompt user, unlike eth_requestAccounts
        });
        
        if (accounts.length > 0) {
          // Get current chain ID
          const chainId = await this.ethereum.request({ 
            method: 'eth_chainId' 
          });
          
          this.address.set(accounts[0]);
          this.chainId.set(parseInt(chainId, 16));
          this.saveConnectionState();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  }

  private saveConnectionState(): void {
    if (this.isBrowser) {
      localStorage.setItem('walletAddress', this.address() || '');
      localStorage.setItem('walletChainId', this.chainId()?.toString() || '');
    }
  }

  private async restoreConnectionState(): Promise<void> {
    if (this.isBrowser) {
      const address = localStorage.getItem('walletAddress');
      const chainId = localStorage.getItem('walletChainId');

      const accounts = await this.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      // Get current chain ID
      const tmpChainId = await this.ethereum.request({ 
        method: 'eth_chainId' 
      });
      
      if (address && address === accounts[0]) {
        this.address.set(address);
      }
      if (chainId && chainId === tmpChainId) {
        this.chainId.set(parseInt(chainId, 10));
      }
    }
  }

  private clearConnectionState(): void {
    if (this.isBrowser) {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletChainId');
    }
  }

  async getUserAddress(): Promise<string> {
    const address = this.address();
    if (!address) {
      throw new Error('No wallet address found. Please connect your wallet.');
    }
    return address;
  }
}