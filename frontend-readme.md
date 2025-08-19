# QuizApp-Frontend: Project Overview, Architecture & Workflow

## About the Project

**QuizApp-Frontend** is a decentralized application (dApp) built using Angular, designed to provide an interactive, secure, and transparent platform for creating and playing quizzes on the blockchain. It serves as the user interface for the QuizApp ecosystem, enabling users to create, join, and participate in blockchain-powered quizzes with seamless wallet integration and real-time smart contract interaction.

**Key Objectives:**
- Offer a fair and decentralized quiz experience powered by Ethereum smart contracts.
- Provide a user-friendly interface for both quiz creators (hosts) and participants.
- Ensure transparency, security, and data integrity by anchoring quiz results and scores on-chain.
- Integrate with MetaMask and other Ethereum-compatible wallets for authentication and signing.

---

## Core Features

- **Quiz Creation:** Users can create new quizzes, which are registered on-chain and in the backend.
- **Joining Quizzes:** Players can join quizzes using a PIN.
- **Answer Submission:** Participants submit answers, which are sent to the backend and ultimately included on-chain.
- **Smart Contract Interaction:** Directly interacts with Ethereum smart contracts to create quizzes, start/finish games, and retrieve results.
- **Wallet Integration:** Connects to MetaMask (or compatible wallets) for authentication and signing.

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

## SEKVENCIJSKI DIJAGRAMI 

Kreiranje kviza (frontend + factory + backend)
```mermaid
sequenceDiagram
    autonumber
    actor U as User (Host)
    participant UI as Angular UI
    participant WAL as Wallet (MetaMask)
    participant ETH as Ethereum Provider
    participant FAC as QuizFactory (SC)
    participant API as Backend API
    participant DB as MongoDB

    U->>UI: Create Quiz (inputs: name, questions, correctAnswers)
    UI->>UI: compute answersHash = keccak256(correctAnswers)
    UI->>WAL: Request connect & signature
    WAL-->>UI: signer available
    UI->>FAC: createBasicQuiz(questionCount, answersHash)
    FAC-->>UI: QuizCreated(address)
    UI->>API: POST /api/quiz/create (quiz meta + questions + answersHash + quizAddress)
    API->>DB: store quiz doc (Quiz, UserAnswers init)
    DB-->>API: ok
    API-->>UI: created (pin, quizAddress)
    UI-->>U: show PIN and quizAddress
```

Priključivanje i slanje odgovora (off-chain prikupljanje)

```mermaid
sequenceDiagram
    autonumber
    actor P as Player
    participant UI as Angular UI
    participant API as Backend API
    participant DB as MongoDB

    P->>UI: Join quiz (enter PIN)
    UI->>API: GET /api/quiz/:pin
    API->>DB: find quiz by PIN
    DB-->>API: quiz meta (quizAddress, questions)
    API-->>UI: quiz details
    P->>UI: Submit answer (per question)
    UI->>API: POST /api/quiz/:quizAddress/submit-answers (addr, qIndex, answer)
    API->>DB: upsert UserAnswers
    DB-->>API: ok
    API-->>UI: accepted
```
Batch sidrenje on-chain i završetak kviza

```mermaid
sequenceDiagram
    autonumber
    actor H as Host
    participant UI as Angular UI
    participant API as Backend API
    participant SVC as QuizService (backend)
    participant DB as MongoDB
    participant QUIZ as Quiz (SC)

    H->>UI: Finish quiz
    UI->>API: POST /api/quiz/:quizAddress/submit-all-answers
    API->>SVC: build batch (players, packedAnswers/scores)
    SVC->>DB: get all UserAnswers
    DB-->>SVC: answers/scores
    SVC->>QUIZ: submitAllAnswers(players, packedAnswers, scores)
    QUIZ-->>SVC: event (AnswersSubmitted)
    SVC-->>API: ok (tx hash)
    API-->>UI: submitted on-chain

    H->>UI: EndQuiz (reveal correctAnswers + winner)
    UI->>QUIZ: endQuiz(correctAnswers, winner, score) via wallet
    QUIZ-->>UI: event QuizFinished(winner, score)
    UI-->>H: show final ranking + link to tx
```


## SEKVENCIJSKI DIJAGRAMI — PlantUML

Kreiranje kviza

```
sequenceDiagram
    autonumber
    actor U as User (Host)
    participant UI as Angular UI
    participant WAL as Wallet (MetaMask)
    participant FAC as QuizFactory (SC)
    participant API as Backend API
    participant DB as MongoDB

    U->>UI: Create Quiz (name, questions, correctAnswers)
    UI->>UI: answersHash = keccak256(correctAnswers)
    UI->>WAL: Request connect + signer
    WAL-->>UI: signer
    UI->>FAC: createBasicQuiz(questionCount, answersHash)
    FAC-->>UI: QuizCreated(address)
    UI->>API: POST /api/quiz/create (meta + questions + answersHash + quizAddress)
    API->>DB: store Quiz + init UserAnswers
    DB-->>API: ok
    API-->>UI: created (pin, quizAddress)
    UI-->>U: Show PIN

```
