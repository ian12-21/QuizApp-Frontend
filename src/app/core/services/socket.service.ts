import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { WalletService } from '../services/wallet.service';

interface QuizRedirectPayload {
  redirectUrl: string;
}

interface ServerToClientEvents {
  'quiz:players': (playerList: string[]) => void;
  'quiz:created': (data: { pin: string; creatorAddress: string }) => void;
  'quiz:started': (data: QuizRedirectPayload) => void;
  'quiz:ended': (data: QuizRedirectPayload) => void;
}

interface ClientToServerEvents {
  'quiz:create': (payload: { pin: string; creatorAddress: string }) => void;
  'quiz:join': (payload: { pin: string; playerAddress: string }) => void;
  'quiz:start': (payload: { pin: string }) => void;
  'quiz:end': (payload: { quizAddress: string; pin: string }) => void;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private readonly walletService = inject(WalletService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  readonly players = signal<string[]>([]);
  private connectionPromise?: Promise<void>;
  private readonly quizStartSubject = new Subject<QuizRedirectPayload>();
  private readonly quizEndSubject = new Subject<QuizRedirectPayload>();

  constructor() {
    if (!this.isBrowser) {
      return;
    }

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
    if (!this.isBrowser) {
      return Promise.resolve();
    }

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
        reconnectionDelay: 1000,
      });

      // Setup socket event listeners
      this.setupSocketListeners();

      // Wait for connection
      this.socket.once('connect', () => {
        console.log('Socket connected successfully');
        // Reset connection promise on successful connection
        this.connectionPromise = undefined;
        resolve();
      });

      // Handle connection error
      this.socket.once('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Clean up on connection failure
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
      // console.log('Received player list:', playerList);
      const uniquePlayers = Array.from(new Set(playerList));
      this.players.set(uniquePlayers);
    });

    this.socket.on('quiz:created', () => {
      // Quiz creation acknowledged by server
    });

    this.socket.on('quiz:started', (data) => {
      this.quizStartSubject.next(data);
    });

    this.socket.on('quiz:ended', (data) => {
      this.quizEndSubject.next(data);
    });

    this.socket.on('disconnect', (reason) => {
      this.players.set([]);

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
    if (!this.isBrowser) {
      return;
    }

    if (!this.socket?.connected) {
      const address = this.walletService.address();
      if (!address) {
        throw new Error('Missing wallet address for socket connection.');
      }

      await this.connectSocket(address);

      if (!this.socket?.connected) {
        throw new Error('Socket connection not established.');
      }
    }
  }

  // Create a new quiz room
  async createQuizRoom(pin: string, creatorAddress: string): Promise<void> {
    try {
      await this.ensureConnection();
    } catch (error) {
      console.warn('Unable to create quiz room: socket connection failed.', error);
      return;
    }

    if (!this.socket) {
      console.warn('Socket not initialized. Cannot create quiz room.');
      return;
    }
    console.log('Creating quiz room:', { pin, creatorAddress });
    this.socket.emit('quiz:create', { pin, creatorAddress });
  }

  // Join an existing quiz queue
  async joinQuizQueue(pin: string, playerAddress: string): Promise<void> {
    try {
      await this.ensureConnection();
    } catch (error) {
      console.warn('Unable to join quiz queue: socket connection failed.', error);
      return;
    }

    if (!this.socket) {
      console.warn('Socket not initialized. Cannot join quiz queue.');
      return;
    }
    // console.log('Joining quiz queue:', { pin, playerAddress });
    this.socket.emit('quiz:join', { pin, playerAddress });
  }

  onQuizStart$(): Observable<QuizRedirectPayload> {
    return this.quizStartSubject.asObservable();
  }

  onQuizEnd$(): Observable<QuizRedirectPayload> {
    return this.quizEndSubject.asObservable();
  }

  async startQuiz(pin: string): Promise<void> {
    try {
      await this.ensureConnection();
    } catch (error) {
      console.warn('Unable to start quiz: socket connection failed.', error);
      return;
    }

    if (!this.socket) {
      console.warn('Socket not initialized. Cannot start quiz.');
      return;
    }
    console.log('Starting quiz:', pin);
    this.socket.emit('quiz:start', { pin });
  }

  async endQuiz(quizAddress: string, pin: string): Promise<void> {
    try {
      await this.ensureConnection();
    } catch (error) {
      console.warn('Unable to end quiz: socket connection failed.', error);
      return;
    }

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
    this.players.set([]);
    this.connectionPromise = undefined;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
