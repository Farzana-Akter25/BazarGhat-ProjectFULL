<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A refund of money back to a customer for a cancelled order.
class Refund extends Model
{
    use HasFactory;

    // Where the money goes: customer wallet or back to the original payment
    public const METHOD_WALLET = 'WALLET';
    public const METHOD_ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT';

    // Why a refund had to fall back to the balance.
    public const FALLBACK_MISSING_GATEWAY_REFERENCE = 'Gateway transaction ID missing';

    // Refund lifecycle statuses
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PROCESSING = 'PROCESSING';
    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_FAILED = 'FAILED';
    // An admin refused a post-delivery refund request.
    public const STATUS_REJECTED = 'REJECTED';

    // Raised by cancelling an order
    public const SOURCE_CANCELLATION = 'CANCELLATION';
    // Asked for after the customer already has the goods
    public const SOURCE_POST_DELIVERY = 'POST_DELIVERY';

    // Statuses that still hold a claim on the order's refundable money.
    public const OPEN_STATUSES = [self::STATUS_PENDING, self::STATUS_PROCESSING];

    // Columns that may be mass-assigned
    protected $fillable = [
        'refund_number',
        'order_id',
        'return_request_id',
        'customer_id',
        'amount',
        'refund_method',
        'is_manual_fallback',
        'fallback_reason',
        'source',
        'payment_method',
        'payment_gateway',
        'original_transaction_id',
        'gateway_transaction_id',
        'sslcommerz_refund_id',
        'status',
        'reason',
        'failure_reason',
        'idempotency_key',
        'requested_by',
        'requested_by_role',
        'approved_by',
        'approved_at',
        'rejected_at',
        'rejection_reason',
        'processed_at',
        'completed_at',
        'last_checked_at',
    ];

    // Column type conversions
    protected $casts = [
        'amount' => 'integer',
        'is_manual_fallback' => 'boolean',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_checked_at' => 'datetime',
    ];

    // The order being refunded
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // The customer receiving the money
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    // The return request that raised this refund, if any
    public function returnRequest()
    {
        return $this->belongsTo(ReturnRequest::class, 'return_request_id');
    }

    // The admin who approved it
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Audit trail entries, oldest first
    public function logs()
    {
        return $this->hasMany(RefundLog::class)->orderBy('id');
    }

    // The wallet credit made for this refund, if any
    public function walletTransaction()
    {
        return $this->hasOne(WalletTransaction::class, 'reference_id')
            ->where('reference_type', WalletTransaction::REF_REFUND);
    }

    // True while this refund is still waiting for an admin to say yes.
    public function awaitsApproval(): bool
    {
        return $this->source === self::SOURCE_POST_DELIVERY
            && $this->status === self::STATUS_PENDING
            && $this->approved_at === null;
    }

    // Customer-facing wording for how the money is coming back.
    public function methodLabel(): string
    {
        return $this->refund_method === self::METHOD_WALLET
            ? 'Refund to BazarGhat Balance'
            : 'Refund to Original Payment Method';
    }

    // "PROCESSING" -> "Processing", for badges shared with the rest of the UI.
    public function statusLabel(): string
    {
        return ucfirst(strtolower($this->status));
    }
}
