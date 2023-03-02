# SC Library

This project presents **Staking** based on timestamp with core functionalities and it's different implementations.

---

## How to clone project?
Clone or fork from Bitbucket `applicature/sc-library:`

```
git clone git@bitbucket.org:applicature/sc-library.git
```

---

## How to set up project?
Install all dependencies:
```
npm install 
```
You should get `node_modules` folder and `package-lock.json`

Rename `.env.example` to `.env` in the main folder and provide your `keys`
```jsx
INFURA_KEY= xxxxxxxxxxxxxxxxxx
INFURA_KEY="17425404118d470ab61c1cded765a510"
```

---

## How to deploy and verify contracts?
Deploy contracts is possible wih `tasks` or with `hardhat scrip`. Before that in `.env` file should be added `PRIVATE_KEY` from your MetaMask wallet and one of API key of the blockchain
```jsx
POLYGONSCAN_API_KEY=
ETHERSCAN_API_KEY=
BSC_API_KEY=
```

To run with hardhat:

```
npx hardhat run --network <your-network> scripts/deploy.js
```

```
npx hardhat verify --network <your-network> <address-deploy-contract> [<param> <param>]
```

To run with tasks:

* to see all tasks

```
npx hardhat
```

* to see all tasks

```
npx hardhat <task-name> [--<verify>]
```

--- 

## How to run tests?
To run all tests at one time:
```
npx hardhat test
```

To run only selected files add in files with tests you want to run before `describe` `.only` - `describe.only`

---

## How to run tests coverage?
To run tests coverage:
```
npx hardhat coverage
```

---

## How to run gas reporter?
To run gas reporter in `hardhat.config.ts` add `currency` that you ant to know price in. In `.env` set keys with values:
```jsx
MAINNET_GAS_PRICE=0.02
COINMARKETCAP_API_KEY="b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c"
RUN_TESTS_WITH_REPORTER=true
```

