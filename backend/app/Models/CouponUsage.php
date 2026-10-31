<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// One use of a coupon on an order
class CouponUsage extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'coupon_id',
        'customer_id',
        'order_id',
        'discount_amount',
        'free_delivery',
    ];

    // Column type conversions
    protected $casts = [
        'discount_amount' => 'integer',
        'free_delivery' => 'boolean',
    ];

    // The coupon that was used
    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }

    // The customer who used it
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    // The order it was used on
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
