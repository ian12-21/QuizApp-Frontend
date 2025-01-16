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
      this.checkExistingConnection();
    }
  }

  private get ethereum(): any {
    return this.isBrowser ? window.ethereum : null;
  }

  private isWalletInstalled(): boolean {
    return this.isBrowser && typeof window.ethereum !== 'undefined';
  }

  private initializeWalletListeners(): void {
    if (this.isWalletInstalled()) {
      // Handle account changes
      this.ethereum.on('accountsChanged', (accounts: string[]) => {
        this.address.set(accounts[0] || null);
        if (!accounts[0]) {
          this.handleDisconnect();
        }
      });

      // Handle chain changes
      this.ethereum.on('chainChanged', (chainId: string) => {
        this.chainId.set(parseInt(chainId, 16));
      });

      // Handle disconnect
      this.ethereum.on('disconnect', () => {
        this.handleDisconnect();
      });
    }
  }

  // Network configurations
  private readonly POLYGON_TESTNET = {
    chainId: '0x13882', 
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/'],
  };

  /* Polygon Mainnet configuration
  private readonly POLYGON_MAINNET = {
    chainId: '0x89', // 137
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  };
  */

  private async switchToPolygonNetwork(): Promise<void> {
    try {
      // Try to switch to the Mumbai network
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `${this.POLYGON_TESTNET.chainId}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await this.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [this.POLYGON_TESTNET],
          });
        } catch (addError) {
          throw new Error('Failed to add Polygon network to wallet');
        }
      } else {
        throw switchError;
      }
    }
  }

  async connect(): Promise<boolean> {
    if (!this.isWalletInstalled()) {
      this.error.set('No wallet found. Please install MetaMask.');
      return false;
    }

    try {
      this.isConnecting.set(true);
      this.error.set(null);

      // Switch to Polygon network first
      await this.switchToPolygonNetwork();

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
    if (this.isWalletInstalled()) {
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
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
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