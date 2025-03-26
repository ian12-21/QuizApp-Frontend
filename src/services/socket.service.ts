import { Injectable, signal } from '@angular/core';
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
    // Get wallet address safely
    const address = this.walletService.address() || '';

    // Only connect if address is available
    if (address) {
      this.socket = io(environment.socketUrl, {
        query: {
          address: address,
        },
      });
      console.log('Socket connected to:', environment.socketUrl);

      // Listen for player join events
      this.socket.on(
        'quiz:player:joined',
        (data: { playerAddress: string; players: string[] }) => {
          // Update the signal with new players list
          this.players.set(data.players);
        }
      );
    } else {
      console.warn(
        'No wallet address available. Socket connection not established.'
      );
    }
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
  // Emit quiz start event
  startQuiz(pin: string) {
    if (!this.socket) {
      console.warn('Socket not initialized. Skipping startQuiz.');
      return;
    }
    this.socket.emit('quiz:start', { pin });
  }
  // Clean up socket connection
  disconnect() {
    this.socket?.disconnect();
  }
}
