# About QuizApp

QuizApp is a decentralized quiz application (dApp) that combines an Angular frontend, a Node/TypeScript backend, and Ethereum smart contracts. The app lets hosts create quizzes, players join with a PIN, submit answers off-chain, and (optionally) anchor results on-chain for transparency and auditability.

This document is written for two audiences:
- End users (players & hosts) who want to understand how to use the app.
- Developers who want to run, test, or extend the frontend, backend, or smart contracts.

---

## Quick overview (high level)

- Frontend: Angular app with components for creating, joining, and running quizzes. Integrates with wallets (MetaMask) and calls the backend API.
- Backend: Node.js + TypeScript Express API that stores quiz metadata and player answers in MongoDB, aggregates answers and prepares on-chain submissions.
- Blockchain: Solidity contracts (Quiz, QuizWithFee, QuizFactory) manage quiz lifecycle on-chain — creation, starting, batch answer submission, ending, prize distribution (paid quizzes).

---

## What makes QuizApp different

- Decentralized final result anchoring: critical results and the final winner are recorded on-chain for transparency.
- Off-chain convenience: answers are collected off-chain (backend) during play to reduce on-chain cost and user friction; the host or backend can batch-submit results to chain.
- Wallet-based ownership: all blockchain actions are signed by wallets (MetaMask) so users keep custody of their keys.

---

## How it works — user flows

1. Create a quiz (host)
   - Host composes quiz questions and correct answers in the frontend.
   - Frontend computes an answers hash (keccak256) and calls the Factory contract to create a new Quiz instance on-chain.
   - After on-chain creation, the frontend posts quiz metadata (questions, answers hash, quiz address) to the backend via POST /api/quiz/create. The backend returns a PIN used to join.

2. Join a quiz (player)
   - Players enter the PIN in the frontend to fetch quiz details from GET /api/quiz/:pin.
   - Players connect their wallet (MetaMask) through the WalletService.

3. Submit answers (during play)
   - Players submit answers per question via POST /api/quiz/:quizAddress/submit-answers (off-chain). Answers are stored in the backend.

4. Batch submit on-chain (host/admin)
   - After the quiz finishes, the host triggers POST /api/quiz/:quizAddress/submit-all-answers.
   - Backend/QuizService aggregates player answers and scores into arrays and either:
     - Backend signs and sends the transaction to the Quiz contract, or
     - Backend returns a prepared transaction for the host to sign in the frontend (preferred for decentralization).

5. End quiz & reveal winner
   - The host calls the Quiz contract's endQuiz(correctAnswers, winner, score) using their wallet.
   - Contract emits QuizFinished event; frontend listens and shows final ranking + transaction link.

Diagrams
- Data flow and sequence diagrams are included in the project READMEs and are compatible with Mermaid-enabled renderers (frontend repo README includes these diagrams).

---

## Key UI actions mapped to system calls

- "Create quiz" → Frontend: QuizService.createQuiz → Factory.createBasicQuiz → Backend POST /api/quiz/create
- "Join quiz" → Frontend GET /api/quiz/:pin → show questions
- "Submit answer" → POST /api/quiz/:quizAddress/submit-answers
- "Submit all answers (host)" → POST /api/quiz/:quizAddress/submit-all-answers → QuizService.submitAllUsersAnswersWithFrontendSigning → Quiz.submitAllAnswers (on-chain)
- "End quiz" → Wallet-signed call to Quiz.endQuiz → show results

---

## Smart contract summary (for users & integrators)

Main contracts and relevant functions (frontend interacts with these via Ethers.js):

- QuizFactory
  - createBasicQuiz(uint256 questionCount, bytes32 answersHash) → returns new quiz address
  - createPaidQuiz(uint256 questionCount, bytes32 answersHash, uint256 entryFee)

- Quiz (basic)
  - startQuiz(address[] _playerAddresses)
  - submitAllAnswers(address[] players, string[] answers, uint128[] scores)
  - endQuiz(string correctAnswers, address _winner, uint256 _score)
  - getQuizResults() view → (winnerAddress, winnerScore, totalPlayers, quizEndTime)
  - getPlayerResults(address player) view → (answers, score)
  - getAllPlayers() view → address[]
  - getQuizInfo() view → (creatorAddress, questions, started, finished, quizAnswersHash, players)
  - getIsStarted() view → bool

- QuizWithFee (paid quizzes)
  - joinQuiz() payable
  - startQuiz(), endQuiz(), getQuizResults(), prize distribution built in

Notes:
- Correct answers are stored as a hash on creation to prevent cheating.
- The system supports batch submission of answers to save gas.
- Paid quizzes include automatic prize splitting (80% winner, 5% creator, 15% platform).

---

## Backend API (endpoints used by the frontend)

Canonical endpoints (check backend code for exact routes and auth requirements):

- POST /api/quiz/create
  - Create and save quiz metadata after on-chain creation
  - Body example: { quizName, questions, answersHash, quizAddress, creatorAddress }

- GET /api/quiz/:pin
  - Get quiz details by PIN (used for joining)

- POST /api/quiz/:quizAddress/submit-answers
  - Submit or upsert a single player's answer (off-chain). Body example: { playerAddress, qIndex, answer }

- POST /api/quiz/:quizAddress/submit-all-answers
  - Prepare and trigger a batched on-chain submission of all players' answers and scores

- POST /api/quiz/:pin/end
  - (Optional) End a quiz and persist winner in the database

Authentication and additional endpoints may exist (JWT-based auth, admin routes). See the backend repository for complete API docs.

---

## For players — simple step-by-step

1. Install MetaMask (or other Ethereum wallet) and connect it to the network the app uses (the frontend can prompt to switch networks — Polygon Amoy testnet is supported).
2. Open the app and click "Join Quiz".
3. Enter the PIN provided by the host.
4. Connect your wallet when prompted.
5. Answer each question in the UI and submit answers (they go to the backend).
6. Wait for the host to submit results on-chain and reveal the winner.
7. Check your score and ranking when the quiz ends.

---

## For hosts / creators — running a quiz

1. Create a quiz in the frontend: provide questions and correct answers.
2. Connect your wallet and deploy a quiz through the Factory contract (done automatically by frontend).
3. Share the generated PIN with players to join.
4. After play time, trigger "Submit all answers" — this aggregates answers and either:
   - submits on-chain (if backend or host wallet does the signing), or
   - returns a prepared tx for you to sign in your wallet.
5. End quiz by calling endQuiz (reveal correct answers) and display final ranking.

---

## Developer setup (local dev / testing)

Important: see each repo README for more details. Summary:

Prerequisites
- Node.js (recommended 16–20)
- npm / yarn / pnpm
- MongoDB (local or Atlas)
- Hardhat (for contracts) / an Ethereum RPC provider (Infura/Alchemy) for deployed tests
- MetaMask for frontend wallet interactions

Frontend (Angular)
- Install: npm install (in frontend repo)
- Run dev: npm run start or ng serve
- Environment: set backend API base URL in environment.ts to point to your running backend.

Backend (Node + Express + MongoDB)
- Install: npm install
- .env (example vars)
  - PORT=4000
  - MONGODB_URI=mongodb://localhost:27017/quizapp
  - ETH_PROVIDER_URL=https://YOUR_RPC_PROVIDER
  - CONTRACT_ADDRESS=0x...
  - PRIVATE_KEY=(optional; avoid in production)
- Run dev: npm run dev (uses ts-node-dev or nodemon)
- Database: ensure MongoDB is running and reachable

Contracts (Hardhat)
- Install dependencies: npm install
- Compile: npx hardhat compile
- Run tests: npx hardhat test
- Deploy locally: npx hardhat node then npx hardhat run scripts/deploy.js --network localhost

Notes about signing:
- Preferred pattern: backend prepares transaction data and the host signs it in the frontend (keeps custody of private keys).
- Alternative: backend signs with a server private key (custodial) — only for controlled environments and with secure key management.

---

## Security & privacy notes (what users should know)

- Wallet control: You sign on-chain transactions with your wallet; never share private keys.
- Off-chain answers: Answers are stored in the backend during play to save gas; the final authoritative result must be anchored on-chain for public verification.
- Sensitive keys: Backend should never store plaintext private keys in code or in repos — use a secret manager.
- Network & fees: On-chain operations require gas; if using testnets (like Polygon Amoy), make sure you have test ETH/MATIC.

---

## Troubleshooting / FAQs

- I can't connect my wallet: Ensure MetaMask is installed, unlocked, and on the correct network. The frontend may ask you to switch networks.
- PIN not found: Verify the host created the quiz successfully and that the backend is running and reachable.
- Tx failing when submitting answers: Check gas limits, RPC provider, and that the contract address used by the frontend matches the deployed contract.
- Backend returns errors on submit-all-answers: Check the backend logs for aggregation errors, database connectivity, and that player answers are present.

---

## Glossary

- dApp: Decentralized Application that interacts with blockchain networks.
- keccak256: Cryptographic hash function used to commit correct answers.
- PIN: Short code generated by backend to let players join a quiz.
- Batch submission: Sending many players' answers/scores to the blockchain in a single transaction to reduce gas.

---

## Contributing & contact

- Report issues or feature requests via the repository issues pages (each repo).
- For development help or questions, contact the maintainer: ian12-21 (GitHub).
- When contributing, follow the standard fork → branch → PR workflow and include tests for new logic.

---

Thank you for using QuizApp — a transparent, wallet-powered way to host & play quizzes!