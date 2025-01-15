import { Injectable } from '@angular/core';
import { WalletService } from './wallet.service';
import { ethers } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private quizFactory: ethers.Contract | null = null;
  private quiz: ethers.Contract | null = null;

  constructor(private walletService: WalletService) {}

  public async initializeQuizFactory(address: string, abi: any) {
    const provider = this.walletService.getProvider();
    if (!provider) throw new Error('Provider not initialized');

    this.quizFactory = new ethers.Contract(
      address,
      abi,
      provider.getSigner()
    );
  }

  public async initializeQuiz(address: string, abi: any) {
    const provider = this.walletService.getProvider();
    if (!provider) throw new Error('Provider not initialized');

    this.quiz = new ethers.Contract(
      address,
      abi,
      provider.getSigner()
    );
  }

  public getQuizFactory(): ethers.Contract {
    if (!this.quizFactory) throw new Error('QuizFactory not initialized');
    return this.quizFactory;
  }

  public getQuiz(): ethers.Contract {
    if (!this.quiz) throw new Error('Quiz not initialized');
    return this.quiz;
  }
}