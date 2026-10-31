<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Append-only ledger row behind users.wallet_balance.
class WalletTransaction extends Model
{
    // Money into or out of the wallet
    public const TYPE_CREDIT = 'CREDIT';
    public const TYPE_DEBIT = 'DEBIT';

    // What the entry relates to
    public const REF_REFUND = 'REFUND';
    public const REF_ORDER = 'ORDER';

    // Columns that may be mass-assigned
    protected $fillable = [
        'customer_id',
        'type',
        'amount',
        'balance_after',
        'reference_type',
        'reference_id',
        'description',
    ];

    // Column type conversions
    protected $casts = [
        'amount' => 'integer',
        'balance_after' => 'integer',
    ];

    // The customer who owns this wallet entry
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }
}
