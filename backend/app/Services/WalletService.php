<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// The only thing allowed to move a customer's BazarGhat refund balance.
class WalletService
{
    // Current balance read fresh from the database
    public function balanceFor(User $customer): int
    {
        return (int) ($customer->fresh()?->wallet_balance ?? 0);
    }

    // Credits a refund into the customer's balance.
    public function credit(User $customer, int $amount, string $referenceType, int $referenceId, string $description): ?WalletTransaction
    {
        return $this->move($customer, WalletTransaction::TYPE_CREDIT, $amount, $referenceType, $referenceId, $description);
    }

    // Spends balance at checkout.
    public function debit(User $customer, int $amount, string $referenceType, int $referenceId, string $description): ?WalletTransaction
    {
        return $this->move($customer, WalletTransaction::TYPE_DEBIT, $amount, $referenceType, $referenceId, $description);
    }

    // Returns refund balance that was spent on an order which never completed payment
    public function returnOrderFunds(Order $order): bool
    {
        // Nothing to return
        if ((int) $order->wallet_amount <= 0 || ! $order->customer) {
            return false;
        }

        try {
            // Credit the balance back (keyed per order, so it only happens once)
            $entry = $this->credit(
                $order->customer,
                (int) $order->wallet_amount,
                WalletTransaction::REF_ORDER,
                $order->id,
                "Refund balance returned — order {$order->order_number} was not paid",
            );

            // The order no longer holds any wallet money
            $order->forceFill(['wallet_amount' => 0])->save();

            return $entry !== null;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }
//balance after is the new balance after the transaction
    private function move(User $customer, string $type, int $amount, string $referenceType, int $referenceId, string $description): ?WalletTransaction
    {
        // Amounts must be positive
        if ($amount <= 0) {
            throw new RuntimeException('A wallet movement must be a positive amount.');
        }

        // Lock the customer row while changing the balance
        return DB::transaction(function () use ($customer, $type, $amount, $referenceType, $referenceId, $description) {
            $locked = User::whereKey($customer->id)->lockForUpdate()->first();

            if (! $locked) {
                throw new RuntimeException('Customer account not found.');
            }

            // Balance before this movement
            $current = (int) $locked->wallet_balance;

            // Cannot spend more than the balance
            if ($type === WalletTransaction::TYPE_DEBIT && $amount > $current) {
                throw new RuntimeException('Your refund balance is not enough to cover that amount.');
            }

            // New balance after this movement
            $balanceAfter = $type === WalletTransaction::TYPE_CREDIT
                ? $current + $amount
                : $current - $amount;

            // Write the ledger entry
            try {
                $entry = WalletTransaction::create([
                    'customer_id' => $locked->id,
                    'type' => $type,
                    'amount' => $amount,
                    'balance_after' => $balanceAfter,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'description' => $description,
                ]);
            } catch (QueryException $e) {
                // Unique key on (customer_id, type, reference_type, reference_id): this movement
                if ($this->isDuplicate($e)) {
                    return null;
                }

                throw $e;
            }

            // Save the new balance on the user
            $locked->wallet_balance = $balanceAfter;
            $locked->save();
            $customer->wallet_balance = $balanceAfter;

            return $entry;
        });
    }

    // True if the database refused the insert because the entry already exists
    private function isDuplicate(QueryException $e): bool
    {
        return ($e->errorInfo[1] ?? null) === 1062 || str_contains($e->getMessage(), 'Duplicate entry');
    }
}
