import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { QuizService } from '../../../services/quizContracts.service';
import { HttpClient } from '@angular/common/http';
const API_URL = 'http://localhost:3000/api';

interface QuizSearchResult {
  quizName: string;
  quizAddress: string;
  pin: string;
  creatorAddress: string;
  answersString: string;
}

interface QuizInfo {
  creator: string;
  questionCount: number;
  isStarted: boolean;
  isFinished: boolean;
  answersHash: string;
  playerAddresses: string[];
}

interface WinnerData {
  winnerAddress: string;
  winnerScore: number;
}

interface PlayerResult {
  answers: string;
  score: number;
}

@Component({
  selector: 'app-search-and-results',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './search-and-results.component.html',
  styleUrls: ['./search-and-results.component.scss']
})
export class SearchAndResultsComponent {
  searchQuery = '';
  isSearching = false;
  selectedQuiz: QuizSearchResult | null = null;
  quizInfo: QuizInfo | null = null;
  winner: WinnerData | null = null;
  players: string[] = [];
  playerResults: Map<string, PlayerResult> = new Map();
  loadingWinner = false;
  loadingPlayers = false;
  loadingPlayerResults = new Set<string>();
  
  // Dropdown functionality
  searchResults: QuizSearchResult[] = [];
  showDropdown = false;
  searchTimeout: any = null;
  correctAnswers: string[] = [];
  Winner: boolean = false;

  constructor(
    private quizService: QuizService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  onSearchInput() {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // If search is empty, hide dropdown
    if (!this.searchQuery.trim()) {
      this.hideDropdown();
      return;
    }

    // Debounce search to avoid too many API calls
    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  async performSearch() {
    if (!this.searchQuery.trim()) return;

    this.isSearching = true;

    try {
      // Search via backend (by name or address)
      const searchResults = await this.http.get<QuizSearchResult[]>(
        `${API_URL}/quiz/search/results?q=${encodeURIComponent(this.searchQuery)}`
      ).toPromise();

      this.searchResults = searchResults || [];
      this.showDropdown = this.searchResults.length > 0;
      
    } catch (error) {
      console.error('Error searching quiz:', error);
      this.searchResults = [];
      this.showDropdown = false;
    } finally {
      this.isSearching = false;
    }
  }

  selectQuiz(quiz: QuizSearchResult) {
    this.selectedQuiz = quiz;
    this.searchQuery = '';
    this.hideDropdown();
    
    // Load the selected quiz
    this.loadSelectedQuiz();
  }

  async loadSelectedQuiz() {
    if (!this.selectedQuiz) return;

    try {
      // Fetch quiz info from contract
      await this.loadQuizInfo();
      
      // Load correct answers from the quiz data
      await this.loadCorrectAnswers();
      
      // Automatically load winner
      await this.loadWinner();
      
    } catch (error) {
      console.error('Error loading quiz:', error);
      this.showError('Failed to load quiz. Please try again.');
    }
  }

  hideDropdown() {
    this.showDropdown = false;
    this.searchResults = [];
  }

  async loadQuizInfo() {
    if (!this.selectedQuiz) return;

    try {
      this.quizInfo = await this.quizService.getQuizInfo(this.selectedQuiz.quizAddress);
    } catch (error) {
      console.error('Error loading quiz info:', error);
      this.showError('Failed to load quiz information');
    }
  }

  async loadWinner() {
    if (!this.selectedQuiz) return;

    this.loadingWinner = true;
    try {
      this.winner = await this.quizService.getWinnerForQuiz(this.selectedQuiz.quizAddress);
    } catch (error) {
      console.error('Error loading winner:', error);
      this.showError('Failed to load winner data');
    } finally {
      this.loadingWinner = false;
    }
  }

  async loadAllPlayers() {
    if (!this.selectedQuiz) return;

    this.loadingPlayers = true;
    try {
      this.players = await this.quizService.getAllPlayers(this.selectedQuiz.quizAddress);
    } catch (error) {
      console.error('Error loading players:', error);
      this.showError('Failed to load players');
    } finally {
      this.loadingPlayers = false;
    }
  }

  async loadPlayerResults(playerAddress: string) {
    if (!this.selectedQuiz) return;

    this.loadingPlayerResults.add(playerAddress);
    try {
      const result = await this.quizService.getPlayerResults(this.selectedQuiz.quizAddress, playerAddress);
      console.log('Player results from contract:', result);
      console.log('Player answers:', result.answers);
      console.log('Player score:', result.score);
      this.playerResults.set(playerAddress, result);
    } catch (error) {
      console.error('Error loading player results:', error);
      this.showError(`Failed to load results for ${this.shortenAddress(playerAddress)}`);
    } finally {
      this.loadingPlayerResults.delete(playerAddress);
    }
  }

  async loadCorrectAnswers() {
    if (!this.selectedQuiz) return;

    try {
      console.log('Loading correct answers...');
      console.log('Selected quiz:', this.selectedQuiz);
      console.log('AnswersString:', this.selectedQuiz.answersString);
      
      // Parse correct answers from the quiz's answersString
      if (this.selectedQuiz.answersString) {
        // Parse the answersString - it should be a JSON array or comma-separated string
        try {
          this.correctAnswers = JSON.parse(this.selectedQuiz.answersString);
          console.log('Parsed correct answers (JSON):', this.correctAnswers);
        } catch {
          // If JSON parse fails, try splitting by comma
          this.correctAnswers = this.selectedQuiz.answersString.split(',').map(answer => answer.trim());
          console.log('Parsed correct answers (split):', this.correctAnswers);
        }
      } else {
        console.log('No answersString found in selected quiz');
      }
    } catch (error) {
      console.error('Error loading correct answers:', error);
    }
  }

  getPlayerAnswers(playerAddress: string): string[] {
    const result = this.playerResults.get(playerAddress);

    if (!result?.answers) {
      console.log('No answers found for player');
      return [];
    }
    
    try {
      const parsed = JSON.parse(result.answers);
      
      // If parsed result is an array, return it
      if (Array.isArray(parsed)) {
        return parsed.map(answer => String(answer));
      }
      
      // If parsed result is a single value, split it into individual characters
      const answerString = String(parsed);
      const splitAnswers = answerString.split('').map(char => char.trim()).filter(char => char !== '');
      return splitAnswers;
      
    } catch (error) {
      
      // If it's already a string, split into individual characters
      if (typeof result.answers === 'string') {
        const splitAnswers = result.answers.split('').map(char => char.trim()).filter(char => char !== '');
        return splitAnswers;
      }
      
      // Fallback: convert to string and split
      const fallbackAnswers = String(result.answers).split('').map(char => char.trim()).filter(char => char !== '');
      return fallbackAnswers;
    }
  }

  isAnswerCorrect(playerAnswer: string, correctAnswer: string | null): boolean {
    if (!correctAnswer) return false;
    return playerAnswer === correctAnswer;
  }

  getCorrectAnswerForIndex(index: number): string | null {
    // Handle case where correctAnswers is an array
    if (Array.isArray(this.correctAnswers)) {
      return this.correctAnswers[index] || null;
    }
    
    // Handle case where correctAnswers is a single combined string
    if (this.correctAnswers) {
      const correctAnswersString = String(this.correctAnswers);
      const splitCorrectAnswers = correctAnswersString.split('').map(char => char.trim()).filter(char => char !== '');
      return splitCorrectAnswers[index] || null;
    }
    
    return null;
  }

  shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 10)}...${address.slice(-4)}`;
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  onEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      // If there are search results, select the first one
      if (this.searchResults.length > 0) {
        this.selectQuiz(this.searchResults[0]);
      }
    } else if (event.key === 'Escape') {
      this.hideDropdown();
    }
  }
}
