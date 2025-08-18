import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../../services/socket.service';
import { QuizService } from '../../../services/quizContracts.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-leaderboard-page',
  imports: [CommonModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrls: ['./leaderboard-page.component.scss'],
  standalone: true
})
export class LeaderboardPageComponent implements OnInit {
  players: any[] = [];
  winner: any;

  constructor(private socketService: SocketService,
              private quizService: QuizService,
              private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    // grab the quiz address from url
    const quizAddress = this.route.snapshot.params['quizAddress'];
    this.winner = await this.quizService.getWinnerForQuiz(quizAddress);

    this.players = this.socketService.players();
  }
}
