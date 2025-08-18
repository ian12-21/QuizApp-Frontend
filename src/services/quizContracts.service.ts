import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ethers, BrowserProvider, JsonRpcSigner, Contract, ContractTransactionResponse } from 'ethers';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UserAnswer } from '../app/pages/live-quiz/live-quiz.component';

const factoryAddress = '0x1038daa959710abc93d91846e28a58e08be46fc0';
const API_URL = 'http://localhost:3000/api';

// Quiz Factory ABI (only the functions we need)
const factoryAbi = [
  "function createBasicQuiz(uint256 questionCount, bytes32 answersHash) external returns (address)",
  "function createPaidQuiz(uint256 questionCount, bytes32 answersHash, uint256 entryFee) external returns (address)",
  "event QuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount)",
  "event FeeQuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount, uint256 entryFee)",
] ;

// Quiz ABI (only the functions we need)
export const quizAbi = [
    // Core functions
    'function startQuiz(address[] _playerAddresses) external',
    'function submitAllAnswers(address[] players, uint128[] answers, uint128[] scores) external',
    'function endQuiz(string correctAnswers, address _winner, uint256 _score) external',
    // Read-only view calls
    'function getQuizResults() external view returns (address winnerAddress, uint256 winnerScore, uint256 totalPlayers, uint256 quizEndTime)',
    'function getPlayerResults(address player) external view returns (uint128 answers, uint128 score)',
    'function getAllPlayers() external view returns (address[] memory)',
    'function getQuizInfo() external view returns (address creatorAddress, uint256 questions, bool started, bool finished, bytes32 quizAnswersHash, address[] memory players)',
    'function getIsStarted() external view returns (bool)',
    'function getIsFinished() external view returns (bool)',
    // Events
    'event QuizStarted(uint256 startTime, uint256 playerCount)',
    'event QuizFinished(address winner, uint256 score)',
    'event PlayerAnswersSubmitted(address indexed player, uint256 score)'
  ];
  
interface QuizFactoryContract extends ethers.BaseContract {
  createBasicQuiz(questionCount: number, answerHash: string): Promise<ContractTransactionResponse>;
  createPaidQuiz(questionCount: number, answerHash: string, entryFee: number): Promise<ContractTransactionResponse>;
}

interface QuizContract extends ethers.BaseContract {
  startQuiz(playerAddresses: string[]): Promise<ContractTransactionResponse>;
  submitAllAnswers(players: string[], answers: number[], scores: number[]): Promise<ContractTransactionResponse>;
  endQuiz(correctAnswers: string, winner: string, score: number): Promise<ContractTransactionResponse>;
  getQuizResults(): Promise<{ winnerAddress: string, winnerScore: number, totalPlayers: number, quizEndTime: number }>;
  getPlayerResults(player: string): Promise<{ answers: number, score: number }>;
  getAllPlayers(): Promise<string[]>;
  getQuizInfo(): Promise<{ creatorAddress: string, questions: number, started: boolean, finished: boolean, quizAnswersHash: string, players: string[] }>;
  getIsStarted(): Promise<boolean>;
  getIsFinished(): Promise<boolean>;
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
            // Use listAccounts() first, then getSigner(address) to avoid ENS resolution on Polygon Amoy
            const accounts = await this.provider?.listAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }
            this.signer = await this.provider?.getSigner(accounts[0].address);
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

          // Ensure we have a fresh signer to avoid any cached ENS issues
          if (!this.signer) {
              await this.initializeAsync();
              if (!this.signer) {
                  throw new Error('Failed to initialize signer');
              }
          }

          // Get a fresh signer specifically for this transaction to avoid ENS issues
          const accounts = await this.provider?.listAccounts();
          if (!accounts || accounts.length === 0) {
              throw new Error('No accounts found');
          }
          const freshSigner = await this.provider?.getSigner(ethers.getAddress(creatorAddress));
          if (!freshSigner) {
              throw new Error('Failed to get fresh signer for creator address');
          }

          // Create a fresh factory contract instance with the creator's signer
          const freshFactory = new Contract(
              factoryAddress,
              factoryAbi,
              freshSigner
          ) as unknown as QuizFactoryContract;

          // Create answers string and hash
          const answersString = questions
              .map(q => q.correctAnswer.toString())
              .join('');
          if (answersString.length === 0 || answersString.length !== questions.length){
            throw new Error('Invalid answers string');
          }
          const answersHash = ethers.keccak256(
              ethers.toUtf8Bytes(answersString)
          );
          
          console.log('Creating quiz with params:', {
              questionCount: questions.length,
              answersHash,
              creatorAddress
          });

          // Add explicit gas limit to avoid gas estimation issues
          const tx = await this.factory.createBasicQuiz(
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
              answersString,
              playerAddresses,
              questions,
          }));

        //   console.log('quizPins:', this.quizPins);

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
                    answersString: string, 
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

    async savePlayers(pin: string, playerAddresses: string[]) {
        try {
            await firstValueFrom(this.http.post(`${API_URL}/quiz/${pin}/add-players`, { playerAddresses }));
        } catch (error) {
            console.error('Error saving players:', error);
            throw new Error('Failed to save players');
        }
    }

    async startQuiz(quizAddress: string, creatorAddress: string, pin: string) {
        try {
            const quizData = await this.getQuizByPin(pin);
            if (!quizData) {
                throw new Error('Quiz not found');
            }

            const signer = await this.provider?.getSigner(ethers.getAddress(creatorAddress));
            if (!signer) {
                throw new Error('Failed to get signer');
            }
            const quiz = new Contract(quizAddress, quizAbi, signer) as unknown as QuizContract;
            
            // Check quiz state
            const isStarted = await quiz.getIsStarted();
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

    //submits every player answer to backend
    async submitAnswer(userAnswer: UserAnswer) {
        try{
            await firstValueFrom(this.http.post(`${API_URL}/quiz/${userAnswer.quizAddress}/submit-answers`, { userAnswer }));
        }catch(error){
            console.error("Error saving answers", error);
            throw error;
        }
    }

    //function that calls the backend function to submit all answers to smart contracts
    async submitAllUsersAnswers(quizAddress: string): Promise<{ success: boolean }> {
        try {
            const response = await firstValueFrom(this.http.get<{ success: boolean }>(`${API_URL}/quiz/${quizAddress}/submit-all-answers`));
            return response;
        } catch (error) {
            console.error('Error submitting answers:', error);
            throw error;
        }
    }

    async endQuiz(
        quizAddress: string,
        creatorAddress: string,
        pin: string,
    ) {
        try {
            const quizData = await this.getQuizByPin(pin);
            if (!quizData) {
                throw new Error('Quiz not found');
            }

            const signer = await this.provider?.getSigner(ethers.getAddress(creatorAddress));
            if (!signer) {
                throw new Error('Failed to get signer');
            }
            const quiz = new Contract(quizAddress, quizAbi, signer) as unknown as QuizContract;
            
            // Check quiz state
            const isStarted = await quiz.getIsStarted();
            const isFinished = await quiz.getIsFinished();
            if (isStarted && !isFinished) {
                throw new Error('Quiz not active');
            }

            const winnerData = await firstValueFrom(this.http.get<{ userAddress: string, score: number }>(`${API_URL}/quiz/${quizAddress}/end`));
            if (!winnerData) {
                throw new Error('Winner not found');
            }

            const tx = await quiz.endQuiz(
                quizData.answersString,
                winnerData.userAddress,
                winnerData.score
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
            };
        } catch (error) {
            console.error('Error ending quiz:', error);
            throw error;
        }
    }

    //this function calls quiz contracts getQuizResults()
    async getWinnerForQuiz(quizAddress: string) {
        try {
            const quiz = new Contract(quizAddress, quizAbi, this.signer) as unknown as QuizContract;
            const winnerData = await quiz.getQuizResults();
            return { 
                winnerAddress: winnerData.winnerAddress, 
                winnerScore: winnerData.winnerScore,
            };
        } catch (error) {
            console.error('Error getting winner:', error);
            throw error;
        }
    }
  /*
  async submitAllUsersAnswersWithFrontendSigning(quizAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    winner?: { userAddress: string, score: number };
  }> {
      try {
          // Get prepared transaction data from backend
          const response = await firstValueFrom(
              this.http.get<{
                  success: boolean;
                  transactionData?: {
                      to: string;
                      data: string;
                      players: string[];
                      answersArray: string[];
                      scoresArray: number[];
                      winner: { userAddress: string, score: number };
                  };
                  error?: string;
              }>(`${API_URL}/quiz/${quizAddress}/prepare-submit-answers`)
          );
  
          if (!response.success || !response.transactionData) {
              throw new Error(response.error || 'Failed to prepare transaction data');
          }
  
          // Get signer for transaction signing
          if (!this.signer) {
              await this.initializeAsync();
          }
  
          if (!this.signer) {
              throw new Error('Failed to get signer');
          }
  
          // Prepare transaction object
          const transactionRequest = {
              to: response.transactionData.to,
              data: response.transactionData.data,
              // Optional: Add gas estimation
              // gasLimit: ethers.parseUnits('500000', 'wei')
          };
  
          console.log('Signing transaction with data:', {
              to: response.transactionData.to,
              players: response.transactionData.players,
              answersArray: response.transactionData.answersArray,
              scoresArray: response.transactionData.scoresArray
          });
  
          // Sign and send the transaction
          const tx = await this.signer.sendTransaction(transactionRequest);
          console.log('Transaction sent:', tx.hash);
  
          // Wait for confirmation
          const receipt = await tx.wait();
          console.log('Transaction confirmed:', receipt?.hash);
  
          return {
              success: true,
              transactionHash: tx.hash,
              winner: response.transactionData.winner
          };
  
      } catch (error) {
          console.error('Error submitting answers with frontend signing:', error);
          throw error;
      }
  }
  
  // Keep the old method for backward compatibility (modify to use the new endpoint)
  async submitAllUsersAnswers(quizAddress: string): Promise<{ success: boolean }> {
      try {
          const response = await firstValueFrom(
              this.http.post<{ success: boolean }>(`${API_URL}/quiz/${quizAddress}/submit-all-answers`, {})
          );
          return response;
      } catch (error) {
          console.error('Error submitting answers:', error);
          throw error;
      }
  }
  */

}
