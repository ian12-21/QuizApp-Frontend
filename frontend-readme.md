# QuizApp-Frontend: Architecture & Workflow Overview

This document explains the core structure, workflow, and main features of the **QuizApp-Frontend**, which is the Angular-based decentralized application (dApp) for interacting with the QuizApp smart contracts and backend.

---

## Core Features

- **Quiz Creation**: Users can create new quizzes which are registered on-chain and in the backend.
- **Joining Quizzes**: Players can join quizzes using a PIN.
- **Answer Submission**: Participants submit answers, which are sent to the backend and ultimately included on-chain.
- **Smart Contract Interaction**: Directly interacts with Ethereum smart contracts to create quizzes, start/finish games, and retrieve results.
- **Wallet Integration**: Connects to MetaMask (or compatible wallets) for authentication and signing.

---

## Main Technologies

- **Angular** (TypeScript, SCSS, HTML)
- **Ethers.js** (Ethereum smart contract interaction)
- **REST API** (for backend communication)
- **MetaMask/Ethereum Wallets** (user authentication and signing)

---

## Workflow Overview

### 1. User Connects Wallet & Joins Quiz

```mermaid
graph TD
    A[User] -- Connects Wallet --> B[WalletService]
    A -- Joins quiz with PIN --> F[API: /api/quiz/:pin]
    B -- Fetches/updates address --> G[Ethereum Provider]
```

### 2. Quiz Creation & Registration

```mermaid
flowchart TD
  U[User] -- "create quiz" --> QF["QuizService: createQuiz"]
  QF -- "call smart contract" --> SC["QuizFactory Contract"]
  SC -- "emit event" --> QF
  QF -- "save quiz info" --> API["Backend /api/quiz/create"]
```

### 3. Answer Submission

```mermaid
flowchart TD
  P[Player] -- "submits answer" --> QS["QuizService: submitAnswer"]
  QS -- "call backend" --> API["/api/quiz/:quizAddress/submit-answers"]
  API -- "store answer" --> DB["Backend DB"]
```

### 4. Submitting All Answers to Chain

```mermaid
flowchart TD
  AdminHost["Admin/Host"] -- "trigger" --> QS["QuizService: submitAllUsersAnswers"]
  QS -- "call backend" --> API["/api/quiz/:quizAddress/submit-all-answers"]
  API -- "on-chain submit" --> SC["QuizContract: submitAllAnswers"]
```

---

## Smart Contract Methods

```typescript
// Factory contract (quiz creation)
function createBasicQuiz(uint256 questionCount, bytes32 answersHash) external returns (address);

// Quiz contract (game logic)
function startQuiz(address[] _playerAddresses) external;
function submitAllAnswers(address[] players, uint128[] answers, uint128[] scores) external;
function endQuiz(string correctAnswers, address _winner, uint256 _score) external;
function getQuizResults() external view returns (...);
```

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Frontend
        UI[Angular Components]
        SVC[QuizService]
        WAL[WalletService]
    end
    subgraph Backend
        API[Express API]
        DB[(MongoDB)]
    end
    subgraph Blockchain
        SC[Quiz Smart Contract]
        FC[Factory Contract]
    end
    UI --> WAL
    UI --> SVC
    SVC --> API
    SVC --> FC & SC
    API --> DB
    API --> SC
```

---

## Wallet & Network Management

- Uses `WalletService` to connect, track, and react to wallet and network changes.
- Supports Polygon Amoy Testnet and can be extended to Mainnet.
- Prompts users to switch networks if needed.

---

## Security & Decentralization Note

- All smart contract transactions are signed by the user's wallet, ensuring full user custody and security.
- The backend is trusted for storing answers and quiz data, but all critical game results and scores are anchored on-chain.

---

*For more technical details, see the [README.md](./README.md) in the repository.*
