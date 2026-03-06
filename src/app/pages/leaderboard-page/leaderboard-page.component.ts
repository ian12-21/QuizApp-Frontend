import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../../services/socket.service';
import { QuizService } from '../../../services/quizContracts.service';
import { WalletService } from '../../../services/wallet.service';
import { LeaderboardPlayer } from '../../../models/quiz.models';

@Component({
  selector: 'app-leaderboard-page',
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrls: ['./leaderboard-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardPageComponent {
  private readonly socketService = inject(SocketService);
  private readonly quizService = inject(QuizService);
  private readonly route = inject(ActivatedRoute);
  protected readonly walletService = inject(WalletService);

  protected readonly players = signal<LeaderboardPlayer[]>([]);

  constructor() {
    this.loadLeaderboard();
  }

  private async loadLeaderboard() {
    const quizAddress = this.route.snapshot.params['quiz-address'];
    try {
      const result = await this.quizService.getTopPlayers(quizAddress);
      this.players.set(result);
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
