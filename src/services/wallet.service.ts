import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ethers } from 'ethers';
import { isPlatformBrowser } from '@angular/common';


@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private readonly isBrowser: boolean;

  private readonly _isConnected = new BehaviorSubject<boolean>(false);
  private readonly _account = new BehaviorSubject<string>('');
  private readonly _chainId = new BehaviorSubject<number>(0);

  public isConnected$ = this._isConnected.asObservable();
  public account$ = this._account.asObservable();
  public chainId$ = this._chainId.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if(this.isBrowser) {
      this.setupEventListeners();
      this.checkConnection();
    }
  }

  //geter for ethereum interFace
  private get ethereum(): any {
    return this.isBrowser ? window.ethereum : null;
  }
  //check if metamask is installed
  public isMetaMaskInstalled(): boolean {
    return this.isBrowser && typeof window.ethereum !== 'undefined';
  }

  private async checkConnection() {
    if (this.isMetaMaskInstalled()) {
      try {
        const accounts = await this.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await this.setupProvider();
          this._account.next(accounts[0]);
          this._isConnected.next(true);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }

  private setupEventListeners() {
    if (this.isMetaMaskInstalled()) {
      this.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      this.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
      this.ethereum.on('disconnect', this.handleDisconnect.bind(this));
    }
  }

  private async handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      this.handleDisconnect();
    } else {
      this._account.next(accounts[0]);
      this._isConnected.next(true);
    }
  }

  private handleChainChanged(chainId: string) {
    window.location.reload();
  }

  private handleDisconnect() {
    this._isConnected.next(false);
    this._account.next('');
    this._chainId.next(0);
  }

  private async setupProvider() {
    if (typeof window.ethereum !== 'undefined') {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      const network = await this.provider.getNetwork();
      this._chainId.next(network.chainId);
    }
  }

  public async connect(): Promise<boolean> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      await this.setupProvider();
      this._account.next(accounts[0]);
      this._isConnected.next(true);
      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this._isConnected.next(false);
    this._account.next('');
    this._chainId.next(0);
    this.provider = null;
    this.signer = null;
  }

  public getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  public getSigner(): ethers.Signer | null {
    return this.signer;
  }

  public async switchNetwork(chainId: number): Promise<boolean> {
    try {
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        return false;
      }
      throw error;
    }
  }

  public shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}