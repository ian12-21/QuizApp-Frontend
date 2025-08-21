import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../../services/socket.service';
import { QuizService } from '../../../services/quizContracts.service';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-leaderboard-page',
  imports: [CommonModule, MatCardModule, RouterModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrls: ['./leaderboard-page.component.scss'],
  standalone: true
})
export class LeaderboardPageComponent implements OnInit {
  players: any[] = [];
  winner: any = { winnerAddress: '', winnerScore: 0 };

  constructor(private socketService: SocketService,
              private quizService: QuizService,
              private route: ActivatedRoute,
              protected walletService: WalletService
  ) {}

  async ngOnInit(): Promise<void> {
    // grab the quiz address from url
    const quizAddress = this.route.snapshot.params['quiz-address'];
    
    try {
      this.players = await this.quizService.getTopPlayers(quizAddress); 
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    }
  }

  protected exit() {
    this.socketService.disconnect();
  }

  protected shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 10)}...${address.slice(-4)}`;
  }
}
