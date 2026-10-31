<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A customer's return or refund request (stored in the "returns" table)
class ReturnRequest extends Model
{
    use HasFactory;

    // Database table name
    protected $table = 'returns';

    // Columns that may be mass-assigned
    protected $fillable = [
        'request_number',
        'order_id',
        'order_item_id',
        'customer_id',
        'type',
        // What the customer asked for.
        'requested_resolution',
        'source',
        'product_name',
        'variant',
        'quantity',
        'price',
        'reason',
        'note',
        'admin_note',
        'photos',
        'amount',
        'payment_method',
        'shipping_fee',
        'status',
        'resolution',
        'preferred_refund_method',
        'refund_method',
        'stock_restored',
        'received_at',
        'restocked_quantity',
        'damaged_quantity',
        'replacement_order_id',
        'refund_status',
        'refund_initiated_at',
        'refund_processing_at',
        'refund_completed_at',
    ];

    // Column type conversions
    protected $casts = [
        'quantity' => 'integer',
        'price' => 'integer',
        'amount' => 'integer',
        'shipping_fee' => 'integer',
        'photos' => 'array',
        'stock_restored' => 'boolean',
        'received_at' => 'datetime',
        'restocked_quantity' => 'integer',
        'damaged_quantity' => 'integer',
        'refund_initiated_at' => 'datetime',
        'refund_processing_at' => 'datetime',
        'refund_completed_at' => 'datetime',
    ];

    // The order the request is for
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // The order line being returned
    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    // The customer who made the request
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    // Every refund raised for this request
    public function refunds()
    {
        return $this->hasMany(Refund::class, 'return_request_id');
    }

    // The replacement order created for this request, if any
    public function replacementOrder()
    {
        return $this->belongsTo(Order::class, 'replacement_order_id');
    }
}
