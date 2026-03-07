export interface QuizData {
  quizName: string;
  numberOfQuestions: number;
  ownerAddress: string;
}

export interface ActiveQuiz {
  pin: string;
  quizName: string;
  creatorAddress: string;
  quizAddress: string;
  isCreator: boolean;
}

export interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
}

export interface QuestionForm {
  question: string;
  answers: string[];
  correctAnswer: number | null;
  isValid?: boolean;
}

export interface Question {
  question: string;
  answers: string[];
  correctAnswer: number;
}

export interface UserAnswer {
  quizAddress: string;
  userAddress: string | null;
  questionIndex: number;
  answer: number | string;
  answerTimeMs: number;
}

export interface QuizSearchResult {
  quizName: string;
  quizAddress: string;
  pin: string;
  creatorAddress: string;
  answersString: string;
}

export interface QuizInfo {
  creator: string;
  questionCount: number;
  isStarted: boolean;
  isFinished: boolean;
  answersHash: string;
  playerAddresses: string[];
}

export interface WinnerData {
  winnerAddress: string;
  winnerScore: number;
}

export interface PlayerResult {
  answers: string;
  score: number;
}

export interface LeaderboardPlayer {
  userAddress: string;
  score: number;
}

export interface QuizByPinResponse {
  pin: string;
  creatorAddress: string;
  quizAddress: string;
  quizName: string;
  answersString: string;
  playerAddresses: string[];
  questions: QuizQuestion[];
}
