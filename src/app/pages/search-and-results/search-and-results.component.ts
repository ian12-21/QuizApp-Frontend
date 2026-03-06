import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { debounceTime, filter, switchMap, catchError, tap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { QuizService } from '../../../services/quizContracts.service';
import { QuizSearchResult, QuizInfo, WinnerData, PlayerResult } from '../../../models/quiz.models';

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-search-and-results',
  imports: [
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
  styleUrls: ['./search-and-results.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchAndResultsComponent {
  private readonly quizService = inject(QuizService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly searchQuery = signal('');
  readonly isSearching = signal(false);
  readonly selectedQuiz = signal<QuizSearchResult | null>(null);
  readonly quizInfo = signal<QuizInfo | null>(null);
  readonly winner = signal<WinnerData | null>(null);
  readonly players = signal<string[]>([]);
  readonly playerResults = signal<Map<string, PlayerResult>>(new Map());
  readonly loadingWinner = signal(false);
  readonly loadingPlayers = signal(false);
  readonly loadingPlayerResults = signal(new Set<string>());
  readonly showDropdown = signal(false);
  readonly correctAnswers = signal<string[]>([]);

  private readonly searchSubject = new Subject<string>();

  readonly searchResults = toSignal(
    this.searchSubject.pipe(
      debounceTime(300),
      filter(query => query.trim().length > 0),
      tap(() => this.isSearching.set(true)),
      switchMap(query =>
        this.http.get<QuizSearchResult[]>(
          `${API_URL}/quiz/search/results?q=${encodeURIComponent(query)}`
        ).pipe(catchError(() => of([] as QuizSearchResult[])))
      ),
      tap(results => {
        this.isSearching.set(false);
        this.showDropdown.set(results.length > 0);
      })
    ),
    { initialValue: [] as QuizSearchResult[] }
  );

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    if (!value.trim()) {
      this.hideDropdown();
      return;
    }

    this.searchSubject.next(value);
  }

  selectQuiz(quiz: QuizSearchResult) {
    this.selectedQuiz.set(quiz);
    this.searchQuery.set('');
    this.hideDropdown();
    
    // Reset all previous quiz data
    this.resetQuizData();
    
    // Load the selected quiz
    this.loadSelectedQuiz();
  }

  private resetQuizData() {
    this.quizInfo.set(null);
    this.winner.set(null);
    this.players.set([]);
    this.playerResults.set(new Map());
    this.correctAnswers.set([]);
    this.loadingWinner.set(false);
    this.loadingPlayers.set(false);
    this.loadingPlayerResults.set(new Set());
  }

  private async loadSelectedQuiz() {
    const quiz = this.selectedQuiz();
    if (!quiz) return;

    try {
      // Fetch quiz info from contract
      await this.loadQuizInfo();
      
      // Load correct answers from the quiz data
      this.loadCorrectAnswers();
      
      // Automatically load winner
      await this.loadWinner();
    } catch (error) {
      console.error('Error loading quiz:', error);
      this.showError('Failed to load quiz. Please try again.');
    }
  }

  hideDropdown() {
    this.showDropdown.set(false);
  }

  private async loadQuizInfo() {
    const quiz = this.selectedQuiz();
    if (!quiz) return;

    try {
      const info = await this.quizService.getQuizInfo(quiz.quizAddress);
      this.quizInfo.set(info);
    } catch (error) {
      console.error('Error loading quiz info:', error);
      this.showError('Failed to load quiz information');
    }
  }

  private async loadWinner() {
    const quiz = this.selectedQuiz();
    if (!quiz) return;

    this.loadingWinner.set(true);
    try {
      const winnerData = await this.quizService.getWinnerForQuiz(quiz.quizAddress);
      this.winner.set(winnerData);
    } catch (error) {
      console.error('Error loading winner:', error);
      this.showError('Failed to load winner data');
    } finally {
      this.loadingWinner.set(false);
    }
  }

  async loadAllPlayers() {
    const quiz = this.selectedQuiz();
    if (!quiz) return;

    this.loadingPlayers.set(true);
    try {
      const result = await this.quizService.getAllPlayers(quiz.quizAddress);
      this.players.set(result);
    } catch (error) {
      console.error('Error loading players:', error);
      this.showError('Failed to load players');
    } finally {
      this.loadingPlayers.set(false);
    }
  }

  async loadPlayerResults(playerAddress: string) {
    const quiz = this.selectedQuiz();
    if (!quiz) return;

    this.loadingPlayerResults.update(set => { const s = new Set(set); s.add(playerAddress); return s; });
    try {
      const result = await this.quizService.getPlayerResults(quiz.quizAddress, playerAddress);
      this.playerResults.update(map => { const m = new Map(map); m.set(playerAddress, result); return m; });
    } catch (error) {
      console.error('Error loading player results:', error);
      this.showError(`Failed to load results for ${this.shortenAddress(playerAddress)}`);
    } finally {
      this.loadingPlayerResults.update(set => { const s = new Set(set); s.delete(playerAddress); return s; });
    }
  }

  private loadCorrectAnswers() {
    const quiz = this.selectedQuiz();
    if (!quiz?.answersString) return;

    try {
      try {
        this.correctAnswers.set(JSON.parse(quiz.answersString));
      } catch {
        this.correctAnswers.set(quiz.answersString.split(',').map(answer => answer.trim()));
      }
    } catch (error) {
      console.error('Error loading correct answers:', error);
    }
  }

  getPlayerAnswers(playerAddress: string): string[] {
    const result = this.playerResults().get(playerAddress);
    if (!result?.answers) return [];

    try {
      const parsed = JSON.parse(result.answers);
      
      // If parsed result is an array, return it
      if (Array.isArray(parsed)) {
        return parsed.map(answer => String(answer));
      }
      
      // If parsed result is a single value, split it into individual characters
      const answerString = String(parsed);
      return answerString.split('').map(char => char.trim()).filter(char => char !== '');
    } catch {
      if (typeof result.answers === 'string') {
        return result.answers.split('').map(char => char.trim()).filter(char => char !== '');
      }
      return String(result.answers).split('').map(char => char.trim()).filter(char => char !== '');
    }
  }

  isAnswerCorrect(playerAnswer: string, correctAnswer: string | null): boolean {
    if (!correctAnswer) return false;
    return playerAnswer === correctAnswer;
  }

  getCorrectAnswerForIndex(index: number): string | null {
    const answers = this.correctAnswers();
    if (Array.isArray(answers)) {
      return answers[index] || null;
    }
    if (answers) {
      const correctAnswersString = String(answers);
      const splitCorrectAnswers = correctAnswersString.split('').map(char => char.trim()).filter(char => char !== '');
      return splitCorrectAnswers[index] || null;
    }
    return null;
  }

  shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 10)}...${address.slice(-4)}`;
  }

  getPolygonScanUrl(address: string): string {
    return `https://amoy.polygonscan.com/address/${address}`;
  }

  openInNewTab(url: string): void {
    window.open(url, '_blank');
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
      const results = this.searchResults();
      if (results.length > 0) {
        this.selectQuiz(results[0]);
      }
    } else if (event.key === 'Escape') {
      this.hideDropdown();
    }
  }
}
