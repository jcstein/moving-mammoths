module hello_world_2::hello_world_2 {
    use std::string;
    use std::signer;

    struct MessageHolder has key {
        message: string::String
    }

    // Event struct
    struct MessageChangeEvent has store, drop {
        account_addr: address,
        message: string::String,
    }

    // Store the last message event
    struct EventStore has key {
        last_event: MessageChangeEvent
    }

    public entry fun set_message(account: &signer, message: string::String) acquires MessageHolder, EventStore {
        let account_addr = signer::address_of(account);

        // Create new event
        let new_event = MessageChangeEvent {
            account_addr,
            message: copy message
        };

        // Store or update event
        if (!exists<EventStore>(account_addr)) {
            move_to(account, EventStore {
                last_event: new_event
            });
        } else {
            let store = borrow_global_mut<EventStore>(account_addr);
            store.last_event = new_event;
        };

        // Store message
        if (!exists<MessageHolder>(account_addr)) {
            move_to(account, MessageHolder { message })
        } else {
            let old_message = borrow_global_mut<MessageHolder>(account_addr);
            old_message.message = message;
        }
    }

    #[view]
    public fun get_last_event(account_addr: address): (address, string::String) acquires EventStore {
        let store = borrow_global<EventStore>(account_addr);
        (store.last_event.account_addr, *&store.last_event.message)
    }

    #[view]
    public fun get_message(account_addr: address): string::String acquires MessageHolder {
        if (!exists<MessageHolder>(account_addr)) {
            return string::utf8(b"No message set")
        };
        *&borrow_global<MessageHolder>(account_addr).message
    }
}
