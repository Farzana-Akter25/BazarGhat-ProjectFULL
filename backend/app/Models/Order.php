<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A customer order with its payment, delivery and status details
class Order extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'order_number',
        'user_id',
        'customer_name',
        'customer_phone',
        'shipping_address',
        'status',
        'cancelled_by',
        'rejection_reason',
        'is_replacement',
        'replacement_for_order_id',
        'payment_status',
        'payment_method',
        'payment_channel',
        'payment_gateway',
        'transaction_id',
        'gateway_transaction_id',
        'gateway_val_id',
        'paid_amount',
        'paid_at',
        'subtotal',
        'discount',
        'delivery_fee',
        'wallet_amount',
        'total_amount',
        'hidden_from_customer_at',
    ];

    // Column type conversions
    protected $casts = [
        'subtotal' => 'integer',
        'discount' => 'integer',
        'delivery_fee' => 'integer',
        'wallet_amount' => 'integer',
        'total_amount' => 'integer',
        'paid_amount' => 'integer',
        'paid_at' => 'datetime',
        'is_replacement' => 'boolean',
        'hidden_from_customer_at' => 'datetime',
    ];

    // The customer who placed the order
    public function customer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Map SSLCommerz's raw card_type / card_issuer / card_brand value
    public static function paymentChannelLabel(?string $raw): ?string
    {
        if (! $raw) {
            return null;
        }

        // card_type arrives as "BRAND-Issuer"
        $value = strtolower(str_replace([' ', '_', '-', '.'], '', $raw));

        // Match known wallets, banks and card brands to a friendly name
        return match (true) {
            str_contains($value, 'bkash') => 'bKash',
            str_contains($value, 'nagad') => 'Nagad',
            // Rocket is DBBL's wallet and reports as DBBLMOBILEBANKING
            str_contains($value, 'rocket'), str_contains($value, 'dbblmobilebanking') => 'Rocket',
            str_contains($value, 'upay') => 'Upay',
            str_contains($value, 'tapnpay') => "Tap'n Pay",
            str_contains($value, 'okwallet') => 'OK Wallet',
            str_contains($value, 'cellfin') => 'CellFin',
            str_contains($value, 'mcash') => 'Islami Bank mCash',
            str_contains($value, 'surecash') => 'SureCash',
            str_contains($value, 'qcash') => 'Q-Cash',
            str_contains($value, 'pmoney') => 'pmoney',
            str_contains($value, 'visa') => 'Visa Card',
            str_contains($value, 'master') => 'Mastercard',
            str_contains($value, 'amex') => 'American Express',
            str_contains($value, 'citytouch') => 'City Touch',
            str_contains($value, 'eblsky') => 'EBL Sky Banking',
            str_contains($value, 'bankasia') => 'Bank Asia',
            str_contains($value, 'abbank'), str_contains($value, 'abdirect') => 'AB Direct',
            str_contains($value, 'modhumoti') => 'Modhumoti Bank',
            str_contains($value, 'woori') => 'Woori Bank',
            str_contains($value, 'fsib') => 'FSIB',
            str_contains($value, 'ibbl'), str_contains($value, 'islami') => 'Islami Bank',
            str_contains($value, 'mtbl') => 'MTB',
            str_contains($value, 'tap') => 'Tap',
            str_contains($value, 'internetbank'), str_contains($value, 'netbank') => 'Internet Banking',
            str_contains($value, 'mobilebank') => 'Mobile Banking',
            // An unmapped issuer
            default => self::readableChannelName($raw),
        };
    }

    // Tidies a channel name no rule recognised into something printable on an invoice
    private static function readableChannelName(string $raw): string
    {
        // Split on dashes/underscores and drop repeated words
        $parts = array_filter(array_map('trim', preg_split('/[-_]+/', $raw)), 'strlen');

        $unique = [];
        foreach ($parts as $part) {
            $key = strtolower($part);

            if (! isset($unique[$key]) || preg_match('/[a-z]/', $part)) {
                $unique[$key] = $part;
            }
        }

        $name = $unique === [] ? trim($raw) : implode(' ', $unique);

        // No lowercase letter anywhere means it arrived shouted.
        return preg_match('/[a-z]/', $name) ? $name : ucwords(strtolower($name));
    }

    // The channel SSLCommerz settled this order through
    public function paymentChannelName(): ?string
    {
        return self::paymentChannelLabel($this->payment_channel);
    }

    // Full payment label naming the gateway AND the channel it charged
    public function paymentMethodLabel(): ?string
    {
        if ($this->payment_method === 'SSLCommerz') {
            $channel = $this->paymentChannelName();

            return $channel ? "SSLCommerz ({$channel})" : 'SSLCommerz';
        }

        return $this->payment_method;
    }

    // Cash a coupon took off the items (a waived delivery fee is not part of it)
    public function couponCashDiscount(): int
    {
        return max(0, (int) $this->subtotal + (int) $this->delivery_fee - (int) $this->total_amount);
    }

    // A line's total less its proportional share of the coupon's cash discount
    public function itemNetAmount(OrderItem $item): int
    {
        $lineTotal = (int) $item->line_total;
        $cash = $this->couponCashDiscount();

        if ($cash <= 0 || (int) $this->subtotal <= 0) {
            return $lineTotal;
        }

        return max(0, $lineTotal - (int) round($lineTotal * $cash / (int) $this->subtotal));
    }

    // The part of the order that actually travels through the payment gateway.
    public function gatewayPayable(): int
    {
        return max(0, (int) $this->total_amount - (int) $this->wallet_amount);
    }

    // True while an online order's payment has not landed.
    public function isAwaitingOnlinePayment(): bool
    {
        return 
        $this->payment_status === 'Paid'
            && $this->payment_gateway !== 'SSLCOMMERZ'
            && $this->status !== 'Cancelled';
    }

    // Query scope: online orders still waiting on payment
    public function scopeAwaitingOnlinePayment($query)
    {
        return $query->where('payment_status', 'paid')
            ->where('payment_gateway', '!=', 'SSLCOMMERZ')
            ->where('status', '!=', 'Cancelled');
    }

    // Orders that really exist
    public function scopePlaced($query)
    {
        return $query->where(fn ($q) => $q
            ->where('payment_status', '!=', 'Paid')
            ->orWhereNull('payment_gateway')
            ->orWhere('payment_gateway', 'SSLCOMMERZ')
            ->orWhere('status', 'Cancelled'));
    }

    // Refunds on this order, newest first
    public function refunds()
    {
        return $this->hasMany(Refund::class)->orderByDesc('id');
    }

    // Products on this order
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // The invoice for this order
    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    // The customer's return or refund request against this order.
    public function returnRequest()
    {
        return $this->hasOne(ReturnRequest::class)->latestOfMany();
    }

    // The latest delivery run for this order
    public function deliveryAssignment()
    {
        return $this->hasOne(DeliveryAssignment::class)->latestOfMany();
    }

    // The collection run for goods owed back on an approved return
    public function returnPickupAssignment()
    {
        return $this->hasOne(DeliveryAssignment::class)->ofMany(
            ['id' => 'max'],
            fn ($query) => $query->where('type', 'Return Pickup'),
        );
    }

    // Status timeline entries, oldest first
    public function statusHistories()
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at');
    }

    // The order this one is a replacement for, when is_replacement is true.
    public function replacementFor()
    {
        return $this->belongsTo(Order::class, 'replacement_for_order_id');
    }

    // The replacement order created for this order, if any.
    public function replacementOrder()
    {
        return $this->hasOne(Order::class, 'replacement_for_order_id');
    }

    // Alphabet for generated order numbers.
    private const NUMBER_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    // A short, unique order number such as "ORD-K7M3XQ".
    public static function generateNumber(string $prefix = 'ORD'): string
    {
        // Keep generating until the number is not already used
        do {
            $suffix = '';
            for ($i = 0; $i < 6; $i++) {
                $suffix .= self::NUMBER_ALPHABET[random_int(0, strlen(self::NUMBER_ALPHABET) - 1)];
            }
            $candidate = $prefix . '-' . $suffix;
        } while (self::where('order_number', $candidate)->exists());

        return $candidate;
    }
}
