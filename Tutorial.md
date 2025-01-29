# Moving Mammoths game tutorial

## Prerequisites

- Node.js installed
- Git installed
- Nightly wallet installed
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
name = "YOUR_MODULE_NAME"  # Change this to your desired name
version = "1.0.0"
authors = []

[addresses]
YOUR_MODULE_NAME = "YOUR_ACCOUNT_ADDRESS"  # Use your wallet address and module name

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-framework"
```

4. Update the module name in the contract code from `moving_mammoths` to `your_module_name`. Change the name of the file to `your_module_name.move`. The original code can be found here:

```
```move
module moving_mammoths::moving_mammoths {
    use std::string;
    use std::signer;
    use std::vector;

    // Score entry struct
    struct ScoreEntry has store, copy, drop {
        player: address,
        score: u64,
        message: string::String,
    }

    // Scoreboard struct to store all scores
    struct Scoreboard has key {
        scores: vector<ScoreEntry>,
        max_entries: u64,
    }

    // Individual player's score holder
    struct MessageHolder has key {
        message: string::String,
        score: u64,
    }

    const MAX_SCOREBOARD_ENTRIES: u64 = 10;
    const E_SCORE_TOO_LOW: u64 = 1;
    const MIN_SCORE: u64 = 30;

    fun init_module(account: &signer) {
        move_to(account, Scoreboard {
            scores: vector::empty<ScoreEntry>(),
            max_entries: MAX_SCOREBOARD_ENTRIES,
        });
    }

    public entry fun set_message_and_score(
        account: &signer,
        message: string::String,
        score: u64
    ) acquires MessageHolder, Scoreboard {
        assert!(score >= MIN_SCORE, E_SCORE_TOO_LOW);

        let account_addr = signer::address_of(account);
        let score_entry = ScoreEntry {
            player: account_addr,
            score,
            message: copy message,
        };

        // Update or create player's score
        if (!exists<MessageHolder>(account_addr)) {
            move_to(account, MessageHolder {
                message: copy message,
                score
            });
        } else {
            let holder = borrow_global_mut<MessageHolder>(account_addr);
            holder.message = copy message;
            holder.score = score;
        };

        // Update scoreboard
        let scoreboard = borrow_global_mut<Scoreboard>(@0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198);
        update_scoreboard(&mut scoreboard.scores, score_entry);
    }

    fun update_scoreboard(scores: &mut vector<ScoreEntry>, new_entry: ScoreEntry) {
        let len = vector::length(scores);

        // If empty or lowest score, just append if there's space
        if (len == 0 || (len < MAX_SCOREBOARD_ENTRIES && new_entry.score <= vector::borrow(scores, len - 1).score)) {
            vector::push_back(scores, new_entry);
            return
        };

        // Find correct position to insert
        let i = 0u64;
        while (i < len) {
            if (new_entry.score > vector::borrow(scores, i).score) {
                break
            };
            i = i + 1;
        };

        // Insert at correct position if within max entries
        if (i < MAX_SCOREBOARD_ENTRIES) {
            vector::push_back(scores, new_entry); // Temporarily add to end
            let j = vector::length(scores) - 1;
            while (j > i) {
                vector::swap(scores, j, j - 1);
                j = j - 1;
            };
            // Remove last element if we exceeded max entries
            if (vector::length(scores) > MAX_SCOREBOARD_ENTRIES) {
                vector::pop_back(scores);
            };
        };
    }

    #[view]
    public fun get_player_score(account_addr: address): (string::String, u64) acquires MessageHolder {
        if (!exists<MessageHolder>(account_addr)) {
            return (string::utf8(b"No score set"), 0)
        };
        let holder = borrow_global<MessageHolder>(account_addr);
        (holder.message, holder.score)
    }

    #[view]
    public fun get_scoreboard_entries(): vector<ScoreEntry> acquires Scoreboard {
        let board = borrow_global<Scoreboard>(@0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198);
        *&board.scores
    }
}
```


Replace `your_module_name` with your module name:

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

## Step 3: Set up the frontend

1. Navigate to the frontend directory and install dependencies:

```
cd ../frontend
npm install
```

2. Update the contract address and module name in `src/components/Scoreboard.tsx`:

```
  const MODULE_ADDRESS = "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
  const MODULE_NAME = "moving_mammoths";
```


To see the contract address details, run `movement move list` and find the name of your module to see the source, other information, and the empty scoreboard array.

```
{
      "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198::moving_mammoths::Scoreboard": {
        "max_entries": "10",
        "scores": []
      }
    },
```

3. Update the contract address and module name in `src/components/WalletContent.tsx`. Here's an example:

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
- Make sure you have a Movement Network wallet installed
- Check that you're on the Porto testnet network

2. If transactions fail:
- Verify your account has sufficient funds
- Check that your module address matches your wallet address

3. If the game doesn't load:
- Clear the browser cache
- Check browser console for errors
- Verify all environment variables are correct

Next steps:
- Customize the game mechanics
- Add your own assets
- Modify the scoring system
- Implement additional features
