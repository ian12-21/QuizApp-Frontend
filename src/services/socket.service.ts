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

  private connectSocket(address: string): void {
    // Disconnect existing socket if any
    if (this.socket) {
      this.disconnect();
    }

    // Reconnect socket
    this.socket = io(environment.socketUrl, {
      query: { address },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Setup socket event listeners
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Listen for player list updates
    this.socket.on('quiz:players', (playerList: string[]) => {
      const uniquePlayers = Array.from(new Set(playerList));
      this.players.set(uniquePlayers);
    });

    // Handle connection
    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      
      // Attempt to reconnect if the disconnection wasn't intentional
      if (reason !== 'io client disconnect') {
        const address = this.walletService.address();
        if (address) {
          this.connectSocket(address);
        }
      }
    });
  }

  // Create a new quiz room
  createQuizRoom(pin: string, creatorAddress: string) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping createQuizRoom.');
      return;
    }
    this.socket.emit('quiz:create', { pin, creatorAddress });
  }
  // Join an existing quiz queue
  joinQuizQueue(pin: string, playerAddress: string) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping joinQuizQueue.');
      return;
    }
    this.socket.emit('quiz:join', { pin, playerAddress });
  }
  // Listen for quiz start event
  onQuizStart(callback: (data: { redirectUrl: string }) => void) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping onQuizStart.');
      return;
    }
    this.socket.on('quiz:started', callback);
  }
  // Listen for quiz end event
  onQuizEnd(callback: (data: { redirectUrl: string }) => void) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping onQuizEnd.');
      return;
    }
    this.socket.on('quiz:ended', callback);
  }
  // Emit quiz start event
  startQuiz(pin: string) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping startQuiz.');
      return;
    }
    this.socket.emit('quiz:start', { pin });
  }
  endQuiz(quizAddress: string, pin: string) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping endQuiz.');
      return;
    }
    this.socket.emit('quiz:end', { quizAddress, pin });
  }
  // Clean up socket connection
  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}