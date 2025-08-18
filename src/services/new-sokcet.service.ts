import { Injectable, signal, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';
import { WalletService } from '../services/wallet.service';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket?: Socket;
  public players = signal<string[]>([]);
  private connectionPromise?: Promise<void>;

  constructor(private walletService: WalletService) {
    // Use an effect to react to wallet address changes
    effect(() => {
      const address = this.walletService.address();   
      // Ensure we have a valid address before connecting
      if (address) {
        this.connectSocket(address);
      } else {
        this.disconnect();
      }
    });
  }

  private connectSocket(address: string): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve) => {
      // Disconnect existing socket if any
      if (this.socket) {
        this.disconnect();
      }

      // Connect socket
      this.socket = io(environment.socketUrl, {
        query: { address },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Setup socket event listeners
      this.setupSocketListeners();

      // Wait for connection
      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.connectionPromise = undefined;
        resolve();
      });

      // Handle connection error
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.connectionPromise = undefined;
        resolve(); // Still resolve to prevent hanging
      });
    });

    return this.connectionPromise;
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Listen for player list updates
    this.socket.on('quiz:players', (playerList: string[]) => {
      console.log('Received player list:', playerList);
      const uniquePlayers = Array.from(new Set(playerList));
      this.players.set(uniquePlayers);
    });

    // Listen for quiz creation confirmation
    this.socket.on('quiz:created', (data) => {
      console.log('Quiz created:', data);
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      
      // Attempt to reconnect if the disconnection wasn't intentional
      if (reason !== 'io client disconnect') {
        const address = this.walletService.address();
        if (address) {
          setTimeout(() => this.connectSocket(address), 1000);
        }
      }
    });
  }

  // Ensure socket is connected before emitting
  private async ensureConnection(): Promise<void> {
    if (!this.socket?.connected) {
      const address = this.walletService.address();
      if (address) {
        await this.connectSocket(address);
      }
    }
  }

  // Create a new quiz room
  async createQuizRoom(pin: string, creatorAddress: string): Promise<void> {
    await this.ensureConnection();
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot create quiz room.');
      return;
    }
    console.log('Creating quiz room:', { pin, creatorAddress });
    this.socket.emit('quiz:create', { pin, creatorAddress });
  }

  // Join an existing quiz queue
  async joinQuizQueue(pin: string, playerAddress: string): Promise<void> {
    await this.ensureConnection();
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot join quiz queue.');
      return;
    }
    console.log('Joining quiz queue:', { pin, playerAddress });
    this.socket.emit('quiz:join', { pin, playerAddress });
  }

  // Listen for quiz start event
  onQuizStart(callback: (data: { redirectUrl: string }) => void) {
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot listen for quiz start.');
      return;
    }
    this.socket.on('quiz:started', callback);
  }

  // Listen for quiz end event
  onQuizEnd(callback: (data: { redirectUrl: string }) => void) {
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot listen for quiz end.');
      return;
    }
    this.socket.on('quiz:ended', callback);
  }

  // Emit quiz start event
  async startQuiz(pin: string): Promise<void> {
    await this.ensureConnection();
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot start quiz.');
      return;
    }
    console.log('Starting quiz:', pin);
    this.socket.emit('quiz:start', { pin });
  }

  async endQuiz(quizAddress: string, pin: string): Promise<void> {
    await this.ensureConnection();
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot end quiz.');
      return;
    }
    console.log('Ending quiz:', { quizAddress, pin });
    this.socket.emit('quiz:end', { quizAddress, pin });
  }

  // Clean up socket connection
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    this.connectionPromise = undefined;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
