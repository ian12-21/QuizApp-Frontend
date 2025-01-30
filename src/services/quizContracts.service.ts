import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ethers, BrowserProvider, JsonRpcSigner, Contract, ContractTransactionResponse } from 'ethers';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const factoryAddress = '0x764739f50DECfD9dFFE849202A940f26AF838525';
const API_URL = 'http://localhost:3000/api';

// Quiz Factory ABI (only the functions we need)
const factoryAbi = [
  "function createQuiz(uint256 questionCount, bytes32 answerHash) external returns (address)",
  "event QuizCreated(address quizAddress)"
] ;

// Quiz ABI (only the functions we need)
const quizAbi = [
  "function startQuiz(address[] calldata _playerAddresses) external",
  "function CalculateWinner(string calldata answers, address[] calldata _players, uint256[] calldata _scores) external returns (address)",
  "function questionCount() external view returns (uint256)",
  "function isStarted() external view returns (bool)",
  "function isFinished() external view returns (bool)",
  "event QuizStarted(uint256 startTime)",
  "event QuizFinished(address winner, uint256 score)"
];

interface QuizFactoryContract extends ethers.BaseContract {
  createQuiz(questionCount: number, answerHash: string): Promise<ContractTransactionResponse>;
}

interface QuizContract extends ethers.BaseContract {
  startQuiz(playerAddresses: string[]): Promise<ContractTransactionResponse>;
  CalculateWinner(answers: string, players: string[], scores: number[]): Promise<ContractTransactionResponse>;
  isStarted(): Promise<boolean>;
  isFinished(): Promise<boolean>;
}

@Injectable({
    providedIn: 'root'
})
export class QuizService {
    private provider?: BrowserProvider;
    private factory?: QuizFactoryContract;
    private signer?: JsonRpcSigner;
    private pinCounter = 0;

    public quizPins: Map<string, {
      quizAddress: string,
      answersString: string,
      playerAddresses: string[]
    }> = new Map();

    private readonly isBrowser: boolean;

    constructor(
        @Inject(PLATFORM_ID) platformId: Object,
        private http: HttpClient
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        if (this.isBrowser) {
            this.provider = new ethers.BrowserProvider(this.ethereum);
            this.initializeAsync();
        }
    }

    private async initializeAsync() {
        try {
            this.signer = await this.provider?.getSigner();
            if (!this.signer) {
                throw new Error('Failed to get signer');
            }
            this.factory = new Contract(
                factoryAddress,
                factoryAbi,
                this.signer
            ) as unknown as QuizFactoryContract;
        } catch (error) {
            console.error('Failed to initialize Web3:', error);
        }
    }

    get ethereum(): any {
        return this.isBrowser ? window.ethereum : null;
    }

    generatePin(): string {
      let pin: number;
      do {
        pin = Math.floor(100000 + Math.random() * 900000 + this.pinCounter++);
      } while (pin >= 1000000); // Ensure PIN is always less than 1 000 000
      return pin.toString();
    }

    async createQuiz(
      creatorAddress: string,
      quizName: string,
      questions: Array<{
          question: string;
          answers: string[];
          correctAnswer: number;
      }>,
    ) {
      try {
          // Validate inputs
          if (!questions.length) {
              throw new Error('No questions provided');
          }

          if (!this.factory) {
              throw new Error('Factory contract not initialized');
          }

          // Create answers string and hash
          const answersString = questions
              .map(q => q.correctAnswer.toString())
              .join('');
          const answersHash = ethers.keccak256(
              ethers.toUtf8Bytes(answersString)
          );

          
          const tx = await this.factory.createQuiz(
              questions.length,
              answersHash
          );
          const receipt = await tx.wait();

          // Get quiz address from event
          if (!receipt) {
              throw new Error('Transaction receipt not found');
          }
          const event = receipt.logs
              .map(log => this.factory?.interface.parseLog(log))
              .find(parsedLog => parsedLog && parsedLog.name === 'QuizCreated');
          if (!event) {
              throw new Error('Quiz creation event not found');
          }
          const [quizAddress] = event.args || [];

          // Generate and store PIN with additional data
          const pin = this.generatePin();
          const playerAddresses: string[] = [];
            
          // Save to backend
          await firstValueFrom(this.http.post(`${API_URL}/quiz/create`, {
              pin,
              creatorAddress,
              quizAddress,
              quizName,
              answersHash,
              playerAddresses,
              questions,
          }));

          console.log('quizPins:', this.quizPins);

          return {
              quizAddress,
              pin
          };
      } catch (error) {
          console.error('Error creating quiz:', error);
          throw error;
      }
    }

    async getQuizByPin(pin: string) {
        try {
            const response = await firstValueFrom(
                this.http.get<{ 
                    pin: string,
                    creatorAddress: string,
                    quizAddress: string, 
                    quizName: string,
                    answersHash: string, 
                    playerAddresses: string[], 
                    questions: { question: string, answers: string[], correctAnswer: number }[] 
                }>(`${API_URL}/quiz/${pin}`)
            );
            return response;
        } catch (error) {
            console.error('Error fetching quiz:', error);
            throw new Error('Quiz not found');
        }
    }

    // async getQuizByAddress(quizAddress: string) {
    //     try {
    //         console.log('Fetching quiz for address:', quizAddress);
    //         const response = await firstValueFrom(
    //             this.http.get<{
    //                 pin: string,
    //                 quizData: {
    //                     quizAddress: string,
    //                     answersHash: string,
    //                     playerAddresses: string[]
    //                 }
    //             }>(`${API_URL}/quiz/address/${quizAddress}`)
    //         );
    //         return response;
    //         console.log('Backend response:', response);
    //         throw new Error('Invalid response format from server');
    //     } catch (error) {
    //         console.error('Error fetching quiz:', error);
    //         throw error instanceof Error ? error : new Error('Quiz not found');
    //     }
    // }

    async startQuiz(quizAddress: string, creatorAddress: string, pin: string) {
        try {
            const quizData = await this.getQuizByPin(pin);
            if (!quizData) {
                throw new Error('Quiz not found');
            }

            const signer = await this.provider?.getSigner(creatorAddress);
            if (!signer) {
                throw new Error('Failed to get signer');
            }
            const quiz = new Contract(quizAddress, quizAbi, signer) as unknown as QuizContract;
            
            // Check quiz state
            const isStarted = await quiz.isStarted();
            if (isStarted) {
                throw new Error('Quiz already started');
            }
            
            const tx = await quiz.startQuiz(quizData.playerAddresses);
            const receipt = await tx.wait();

            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }
            
            const event = receipt.logs
                .map(log => quiz.interface.parseLog(log))
                .find(parsedLog => parsedLog && parsedLog.name === 'QuizStarted');
            const [startTime] = event?.args || [];

            return { startTime: startTime.toString() };
        } catch (error) {
            console.error('Error starting quiz:', error);
            throw error;
        }
    }

    // async endQuiz(
    //     quizAddress: string,
    //     creatorAddress: string,
    //     pin: string,
    //     playerScores: { [address: string]: number }
    // ) {
    //     try {
    //         const quizData = await this.getQuizByPin(pin);
    //         if (!quizData) {
    //             throw new Error('Quiz not found');
    //         }

    //         const signer = await this.provider?.getSigner(creatorAddress);
    //         if (!signer) {
    //             throw new Error('Failed to get signer');
    //         }
    //         const quiz = new Contract(quizAddress, quizAbi, signer) as unknown as QuizContract;
            
    //         // Check quiz state
    //         const isStarted = await quiz.isStarted();
    //         const isFinished = await quiz.isFinished();
    //         if (!isStarted || isFinished) {
    //             throw new Error('Quiz not active');
    //         }

    //         // Convert player scores to arrays matching the contract format
    //         const players = quizData.playerAddresses;
    //         const scores = players.map(addr => playerScores[addr] || 0);
            
    //         const tx = await quiz.CalculateWinner(
    //             quizData.answersString,
    //             players,
    //             scores
    //         );
    //         const receipt = await tx.wait();
            
    //         if (!receipt) {
    //             throw new Error('Transaction receipt not found');
    //         }
    //         const event = receipt.logs
    //             .map(log => quiz.interface.parseLog(log))
    //             .find(parsedLog => parsedLog && parsedLog.name === 'QuizFinished');
    //         const [winner, score] = event?.args || [];

    //         return { 
    //             winner, 
    //             score: score.toString(),
    //         };
    //     } catch (error) {
    //         console.error('Error ending quiz:', error);
    //         throw error;
    //     }
    // }

    getQuizContract(quizAddress: string): QuizContract {
        return new ethers.Contract(
            quizAddress,
            quizAbi,
            this.signer
        ) as unknown as QuizContract;
    }

    async isQuizStarted(quizAddress: string): Promise<boolean> {
        const quiz = this.getQuizContract(quizAddress);
        return await quiz.isStarted();
    }

    async isQuizFinished(quizAddress: string): Promise<boolean> {
        const quiz = this.getQuizContract(quizAddress);
        return await quiz.isFinished();
    }

}
