# Moving Mammoths game tutorial

## Prerequisites

- Node.js installed
- Git installed
- [Nightly wallet](https://nightly.app) installed
- Basic knowledge of TypeScript and React
- [Movement CLI installed](https://docs.movementnetwork.xyz/devs/movementcli)

## Step 1: Clone the repository

```bash
git clone https://github.com/jcstein/moving-mammoths
cd moving-mammoths
```

## Step 2: Deploy your own module

1. Navigate to the move directory and copy the example config:

```bash
cd move
cp -a .movement.example .movement
```

2. Change the name of `.config.yaml.example` to `config.yaml` and add your wallet details from Movement CLI. See [this page for more information on how to get your wallet details](https://docs.movementnetwork.xyz/devs/firstmove).

```
---
profiles:
  default:
    network: Testnet
    private_key: "YOUR_PRIVATE_KEY"
    public_key: "YOUR_PUBLIC_KEY"
    account: "YOUR_ACCOUNT_ADDRESS"
    rest_url: "https://aptos.testnet.porto.movementlabs.xyz/v1/"
    faucet_url: "https://faucet.testnet.porto.movementlabs.xyz/"
```

3. Update the module name in `Move.toml`:

```
[package]
name = "your_module_name"  # Change this to your desired name
version = "1.0.0"
authors = []

[addresses]
your_module_name = "YOUR_ACCOUNT_ADDRESS"  # Use your wallet address and module name

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-framework"
```

4. Update the module name in the contract code from `moving_mammoths` to `your_module_name`. Change the name of the file to `your_module_name.move`. The original code can be found in [`moving_mammoths.move`](./move/sources/moving_mammoths.move):

```
module moving_mammoths::moving_mammoths {
    use std::string;
    use std::signer;
    use std::vector;

    // rest of code
```


Replace `moving_mammoths` with your module name:

```
module your_module_name::your_module_name {
    // ... rest of the code remains the same
}
```


5. Compile and deploy the contract:

```
movement move compile
movement move publish
```

Keep the module address and name handy for the next step.

## Step 3: Set up the frontend

1. Navigate to the frontend directory and install dependencies:

```
cd ../frontend
npm install
```

2. Update the module address and module name in `src/components/Scoreboard.tsx`:

```
const MODULE_ADDRESS = "YOUR_MODULE_ADDRESS";
const MODULE_NAME = "your_module_name";
const TESTNET_API = "https://aptos.testnet.porto.movementlabs.xyz/v1";
```

Replace `YOUR_MODULE_ADDRESS` with your module address and `your_module_name` with your module name. Example:

```
const MODULE_ADDRESS = "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
const MODULE_NAME = "moving_mammoths";
```

To see the module address details, run `movement move list` and find the name of your module to see the source, other information, and the empty scoreboard array. Example:

```
{
      "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198::moving_mammoths::Scoreboard": {
        "max_entries": "10",
        "scores": []
      }
    },
```

3. Update the module address and module name in `src/components/WalletContent.tsx`. Here's an example:

```
const MODULE_ADDRESS =
  "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
const MODULE_NAME = "moving_mammoths";
const TESTNET_API = "https://aptos.testnet.porto.movementlabs.xyz/v1";
```

## Step 4: Run the game

1. Start the development server:

```
npm run dev
```

2. Open your browser and navigate to `http://localhost:5173` to play the game.

## Step 5: Deploy to production

Use a service like Vercel or Fleek to host your frontend. Be careful to not expose your `.movement` directory to the public if you commit the whole project.

## Troubleshooting

1. If you encounter wallet connection issues:
- Make sure you have the Nightly wallet installed
- Check that you're on the Movement Porto testnet

2. If transactions fail:
- Verify your account has sufficient funds
- Check that your module address matches your wallet address

3. If the game doesn't load:
- Clear the browser cache
- Check browser console for errors
- Verify all environment variables are correct

## Next steps:

1. [Sign up for Mammothon](https://mammothon.celestia.org)
- Customize the game mechanics
- Add your own assets
- Modify the scoring system
- Implement additional features
- See the [todos in readme](./README.md#todos)
