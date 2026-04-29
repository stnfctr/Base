# NanoPay API Marketplace ⚡️
<img width="619" height="353" alt="nanopay" src="https://github.com/user-attachments/assets/1d138af7-d329-4421-a851-31552b909bed" />

NanoPay is a micro-transaction based API marketplace where users "pay-per-call" instead of subscribing to monthly plans. This project includes a full-stack dashboard and a smart contract deployment setup for **Base Sepolia**.

## 🚀 Features

- **Micro-payments:** Pay exactly for what you use using virtual credits (simulated) or smart contract payments.
- **Base Sepolia Integration:** Ready-to-deploy Solidity smart contract and Hardhat configuration.
- **Pay-per-API Dashboard:** Real-time console, wallet management, and API execution simulation.
- **Secure Infrastructure:** Firebase-backed authentication and Firestore security rules.

## 🛠 Tech Stack

- **Frontend:** React, Tailwind CSS 4, Motion (Animations), Lucide Icons.
- **Backend:** Express, Node.js, Firebase Admin SDK.
- **Web3:** Hardhat, Ethers.js, Solidity (0.8.20).
- **Database:** Google Cloud Firestore.

## 📦 Getting Started

### 1. Prerequisites
Ensure you have the following environment variables in your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key
PRIVATE_KEY=your_metamask_private_key (for Base deployment)
BASESCAN_API_KEY=your_basescan_api_key (optional for verification)
```

### 2. Installation
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## ⛓ Base Sepolia Smart Contract

The project contains a `NanoPay.sol` contract located in `/contracts`.

### Deploying to Base Sepolia
Before deploying, make sure you have Sepolia ETH in your Base Sepolia wallet. You can get some from the [Base Sepolia Faucet](https://base.org/faucets).

To deploy the contract:
```bash
npm run deploy:base
```

### Manual Command
Alternatively, you can run the Hardhat command directly:
```bash
npx hardhat run scripts/deploy.ts --network base-sepolia
```

## 📁 File Structure

- `/src`: React frontend applications and services.
- `/server.ts`: Express backend serving the AI simulation and wallet API.
- `/contracts`: Solidity source code.
- `/scripts`: Deployment scripts for Hardhat.
- `hardhat.config.ts`: Configuration for Base Sepolia and other networks.
- `firebase-blueprint.json`: Data structure definition for Firestore.

## 📜 License
Apache-2.0
[README.md](https://github.com/user-attachments/files/27215443/README.md)
