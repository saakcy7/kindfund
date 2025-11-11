module donation_app::donation {
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    public struct DonationBox has key {
        id: UID,
        total: u64,
    }

    public struct DonationEvent has copy, drop {
        donor: address,
        amount: u64,
        charity: address,
    }

    // Create donation box
    public entry fun create(ctx: &mut TxContext) {
        let box = DonationBox {
            id: object::new(ctx),
            total: 0,
        };
        transfer::share_object(box);
    }

    
    public entry fun donate(
        coin: Coin<SUI>,
        amount: u64,
        _message: vector<u8>,
        charity: address,
        ctx: &mut TxContext
    ) {
        // Verify amount matches coin value
        let actual_amount = coin::value(&coin);
        assert!(actual_amount == amount, 0);

        // Create or get donation box (you might want to store this differently)
        // For now, we'll just emit an event and transfer funds
        
        event::emit(DonationEvent {
            donor: tx_context::sender(ctx),
            amount: amount,
            charity: charity,
        });

        // Transfer the coins to charity
        transfer::public_transfer(coin, charity);
    }

    public fun get_total(box: &DonationBox): u64 {
        box.total
    }
}