<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A checkout coupon: a system free-delivery one (FIRSTORDER, FREESHIP2000) or one an admin created
class Coupon extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'coupon_code',
        'campaign_name',
        'coupon_type',
        'audience',
        'discount_value',
        'max_discount',
        'minimum_order',
        'start_date',
        'expiry_date',
        'usage_limit',
        'per_user_limit',
        'first_order_only',
        'min_completed_orders',
        'min_total_spent',
        'generated_by',
        'status',
    ];

    // Column type conversions
    protected $casts = [
        'first_order_only' => 'boolean',
        'minimum_order' => 'integer',
        'discount_value' => 'integer',
        'max_discount' => 'integer',
        'usage_limit' => 'integer',
        'per_user_limit' => 'integer',
        'min_completed_orders' => 'integer',
        'min_total_spent' => 'integer',
        'start_date' => 'date',
        'expiry_date' => 'date',
    ];

    // Every time this coupon was used
    public function usages()
    {
        return $this->hasMany(CouponUsage::class);
    }

    // Customers an admin handed this coupon to (audience "selected")
    public function customers()
    {
        return $this->belongsToMany(User::class, 'customer_coupons', 'coupon_id', 'customer_id')
            ->withPivot(['assigned_by', 'assignment_type', 'is_used', 'used_at', 'order_id'])
            ->withTimestamps();
    }
}
