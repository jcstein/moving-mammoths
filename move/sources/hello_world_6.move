module hello_world_6::hello_world_6 {
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
