<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;

// The customer's BazarGhat refund balance
class WalletController extends Controller
{
    // Inject the wallet service
    public function __construct(private WalletService $wallet)
    {
    }

    // Return the customer's current balance
    public function show(Request $request)
    {
        $customer = $request->user();

        return response()->json([
            'balance' => $this->wallet->balanceFor($customer),
            'currency' => 'BDT',
        ]);
    }

    // Return the balance and the latest 100 wallet transactions
    public function transactions(Request $request)
    {
        $transactions = WalletTransaction::where('customer_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'balance' => $this->wallet->balanceFor($request->user()),
            'transactions' => $transactions->map(fn (WalletTransaction $entry) => [
                'id' => $entry->id,
                'type' => $entry->type,
                'amount' => $entry->amount,
                'balanceAfter' => $entry->balance_after,
                'referenceType' => $entry->reference_type,
                'referenceId' => $entry->reference_id,
                'description' => $entry->description,
                'date' => $entry->created_at?->toIso8601String(),
            ]),
        ]);
    }
}
