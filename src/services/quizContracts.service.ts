import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ethers, BrowserProvider, JsonRpcSigner, Contract, ContractTransactionResponse } from 'ethers';

const factoryAddress = '0x764739f50DECfD9dFFE849202A940f26AF838525';

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

    private quizPins: Map<string, {
      quizAddress: string,
      answersString: string,
      playerAddresses: string[]
    }> = new Map();

    private readonly isBrowser: boolean;

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
        if (this.isBrowser) {
            this.provider = new ethers.BrowserProvider(this.ethereum);
            this.initializeAsync();
        } else {
            console.error('Please install MetaMask!');
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
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      return pin;
    }

    getQuizContract(quizAddress: string): QuizContract {
        return new ethers.Contract(
            quizAddress,
            quizAbi,
            this.signer
        ) as unknown as QuizContract;
    }

    async createQuiz(
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
          this.quizPins.set(pin, {
              quizAddress,
              answersString,
              playerAddresses: []
          });

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
      const quizData = this.quizPins.get(pin);
      if (!quizData) {
          throw new Error('Quiz not found');
      }
      return quizData;
  }

  async startQuiz(quizAddress: string, creatorAddress: string, pin: string, _playerAddresses: string[]) {
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

          quizData.playerAddresses = _playerAddresses;
          
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

  async endQuiz(
      quizAddress: string,
      creatorAddress: string,
      pin: string,
      playerScores: { [address: string]: number }
  ) {
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
          const isFinished = await quiz.isFinished();
          if (!isStarted || isFinished) {
              throw new Error('Quiz not active');
          }

          // Convert player scores to arrays matching the contract format
          const players = quizData.playerAddresses;
          const scores = players.map(addr => playerScores[addr] || 0);
          
          const tx = await quiz.CalculateWinner(
              quizData.answersString,
              players,
              scores
          );
          const receipt = await tx.wait();
          
          if (!receipt) {
              throw new Error('Transaction receipt not found');
          }
          const event = receipt.logs
              .map(log => quiz.interface.parseLog(log))
              .find(parsedLog => parsedLog && parsedLog.name === 'QuizFinished');
          const [winner, score] = event?.args || [];

          return { 
              winner, 
              score: score.toString(),
              // allScores: players.map((addr, i) => ({
              //     address: addr,
              //     score: scores[i]
              // }))
          };
      } catch (error) {
          console.error('Error ending quiz:', error);
          throw error;
      }
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
