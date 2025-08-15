import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../../services/socket.service';

// interface Player {
//   name: string;
//   score: number;
// }

@Component({
  selector: 'app-leaderboard-page',
  imports: [CommonModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrls: ['./leaderboard-page.component.scss'],
  standalone: true
})
export class LeaderboardPageComponent implements OnInit {
  players: any[] = [];

  constructor(private socketService: SocketService) {}

  ngOnInit(): void {
    // For demonstration purposes, populate with sample data
    // In a real app, this would come from a service
    // this.players = [
    //   { name: 'Player 1', score: 950 },
    //   { name: 'Player 2', score: 820 },
    //   { name: 'Player 3', score: 780 },
    //   { name: 'Player 4', score: 650 },
    //   { name: 'Player 5', score: 520 },
    // ];

    this.players = this.socketService.players();

  // Add some random players if the array is empty
  if (this.players.length === 0) {
    const names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Sam', 'Jamie', 'Avery'];
    for (let i = 0; i < 8; i++) {
      this.players.push({
        name: names[Math.floor(Math.random() * names.length)],
        score: Math.floor(Math.random() * 1000)
      });
    }
  }


    console.log(this.players);

    this.players.sort((a, b) => b.score - a.score);
  }
}
