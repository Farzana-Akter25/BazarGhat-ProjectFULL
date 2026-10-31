<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Collection;

// Coupon engine for BazarGhat checkout: the system free-delivery coupons plus the ones admins create.
class CouponService
{
    // Orders at or above this subtotal (in Taka) qualify for the threshold coupon
    public const FREE_DELIVERY_THRESHOLD = 2000;

    // the coupon a customer gets on their very first order
    public const FIRST_ORDER_CODE = 'FIRSTORDER';

    // the coupon any large enough cart gets
    public const THRESHOLD_CODE = 'FREESHIP2000';

    // Whether this customer has ever placed an order that wasn't cancelled
    public function hasPlacedOrderBefore(User $user): bool
    {
        // a cancelled order never counts as a first order
        return Order::where('user_id', $user->id)->where('status', '!=', 'Cancelled')->exists();
    }

    // Delivered orders (free replacements excluded) — what "completed orders" and "total spent" rules look at
    private function completedOrders(User $user)
    {
        return Order::where('user_id', $user->id)
            ->where('status', 'Delivered')
            ->where('is_replacement', false);
    }

    // The coupon(s) this customer can apply right now
    public function eligibleCoupons(User $user, int $subtotal): Collection
    {
        $coupons = collect();

        // an empty cart earns nothing
        if ($subtotal <= 0) {
            return $coupons;
        }

        // first-timers get the first order coupon
        if (! $this->hasPlacedOrderBefore($user)) {
            $coupons->push($this->ensureCoupon(self::FIRST_ORDER_CODE, firstOrderOnly: true, minimumOrder: null));
        }

        // a cart worth 2000 or more gets the threshold coupon as well
        if ($subtotal >= self::FREE_DELIVERY_THRESHOLD) {
            $coupons->push($this->ensureCoupon(self::THRESHOLD_CODE, firstOrderOnly: false, minimumOrder: self::FREE_DELIVERY_THRESHOLD));
        }

        // admin coupons whose every rule this customer and cart already meet
        $adminCoupons = Coupon::where('generated_by', 'Admin')
            ->where('status', 'active')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (Coupon $coupon) => $this->ruleFailure($coupon, $user, $subtotal) === null);

        // a system coupon that the admin switched off is not offered either
        return $coupons->filter(fn (Coupon $c) => $c->status === 'active')->concat($adminCoupons)->values();
    }

    // Validate a coupon code for this customer/subtotal and work out what it takes off
    public function resolveForCheckout(User $user, string $code, int $subtotal, bool $lock = false): array
    {
        // lock the coupon row while an order is being placed so a usage limit can't be overshot
        $query = Coupon::where('coupon_code', $code);
        $coupon = $lock ? $query->lockForUpdate()->first() : $query->first();

        if (! $coupon) {
            abort(422, 'Invalid coupon code.');
        }

        // throws if the code fails any of the rules
        $failure = $this->ruleFailure($coupon, $user, $subtotal);
        if ($failure !== null) {
            abort(422, $failure);
        }

        return [
            'coupon' => $coupon,
            'freeDelivery' => $coupon->coupon_type === 'free_delivery',
            // cash taken off the item subtotal (0 for a free-delivery coupon)
            'discount' => $this->cashDiscount($coupon, $subtotal),
        ];
    }

    // Cash a coupon takes off this subtotal — never more than the subtotal itself
    public function cashDiscount(Coupon $coupon, int $subtotal): int
    {
        $value = (int) $coupon->discount_value;

        $amount = match ($coupon->coupon_type) {
            'fixed_discount' => $value,
            'percentage_discount' => (int) floor($subtotal * $value / 100),
            default => 0,
        };

        // a percentage coupon can carry a ceiling
        if ($coupon->coupon_type === 'percentage_discount' && $coupon->max_discount) {
            $amount = min($amount, (int) $coupon->max_discount);
        }

        return max(0, min($amount, $subtotal));
    }

    // Short text the checkout shows under a coupon code
    public function describe(Coupon $coupon): string
    {
        $benefit = match ($coupon->coupon_type) {
            'fixed_discount' => '৳' . $coupon->discount_value . ' off',
            'percentage_discount' => $coupon->discount_value . '% off'
                . ($coupon->max_discount ? ' (up to ৳' . $coupon->max_discount . ')' : ''),
            default => 'Free delivery',
        };

        if ($coupon->first_order_only) {
            return $benefit . ' on your first order';
        }

        return $coupon->minimum_order
            ? $benefit . ' on orders ৳' . $coupon->minimum_order . '+'
            : $benefit . ' on this order';
    }

    // Record a coupon's use against an order — increments its usage count.
    public function redeem(Coupon $coupon, User $user, Order $order, int $discountAmount = 0): void
    {
        // one row per redemption: who used it, and on which order
        CouponUsage::create([
            'coupon_id' => $coupon->id,
            'customer_id' => $user->id,
            'order_id' => $order->id,
            'discount_amount' => $discountAmount,
            'free_delivery' => $coupon->coupon_type === 'free_delivery',
        ]);

        // a hand-picked customer's copy is marked used
        $coupon->customers()->updateExistingPivot($user->id, [
            'is_used' => true,
            'used_at' => now(),
            'order_id' => $order->id,
        ]);
    }

    // How many times a coupon has been used on orders that still stand (cancelled orders give the use back)
    public function usageCount(Coupon $coupon, ?User $user = null): int
    {
        return CouponUsage::where('coupon_id', $coupon->id)
            ->when($user, fn ($q) => $q->where('customer_id', $user->id))
            ->where(function ($q) {
                $q->whereNull('order_id')
                    ->orWhereHas('order', fn ($o) => $o->where('status', '!=', 'Cancelled'));
            })
            ->count();
    }

    // Get the system coupon by code, creating it the first time it's needed.
    private function ensureCoupon(string $code, bool $firstOrderOnly, ?int $minimumOrder): Coupon
    {
        // firstOrCreate, so the same code is never created twice
        return Coupon::firstOrCreate(
            ['coupon_code' => $code],
            [
                'campaign_name' => $firstOrderOnly ? 'First order free delivery' : 'Free delivery on ৳2000+ orders',
                'coupon_type' => 'free_delivery',
                'audience' => 'all',
                'minimum_order' => $minimumOrder,
                'first_order_only' => $firstOrderOnly,
                // marks it as the system's own, not an admin's
                'generated_by' => 'System',
                'status' => 'active',
                // a system coupon may be used on any number of orders
                'per_user_limit' => null,
            ],
        );
    }

    // Every rule a code has to pass before checkout will honour it; returns the reason it fails, or null
    private function ruleFailure(Coupon $coupon, User $user, int $subtotal): ?string
    {
        // switched off by an admin
        if ($coupon->status !== 'active') {
            return 'This coupon is no longer active.';
        }

        $today = now()->startOfDay();

        // campaign has not started yet
        if ($coupon->start_date && $today->lt($coupon->start_date)) {
            return 'This coupon is not active yet.';
        }

        // campaign is over
        if ($coupon->expiry_date && $today->gt($coupon->expiry_date)) {
            return 'This coupon has expired.';
        }

        // only the customers the admin picked may use it
        if ($coupon->audience === 'selected' && $coupon->generated_by === 'Admin'
            && ! $coupon->customers()->where('users.id', $user->id)->exists()) {
            return 'This coupon is not available for your account.';
        }

        // cart is below the amount this coupon asks for
        if ($coupon->minimum_order && $subtotal < $coupon->minimum_order) {
            return 'This coupon needs an order of at least ৳' . $coupon->minimum_order . '.';
        }

        // a returning customer cannot use a first order coupon
        if ($coupon->first_order_only && $this->hasPlacedOrderBefore($user)) {
            return 'This coupon is only valid on your first order.';
        }

        // loyalty rule: enough delivered orders already
        if ($coupon->min_completed_orders
            && $this->completedOrders($user)->count() < $coupon->min_completed_orders) {
            return 'This coupon is for customers with at least ' . $coupon->min_completed_orders . ' completed orders.';
        }

        // loyalty rule: enough spent already
        if ($coupon->min_total_spent
            && (int) $this->completedOrders($user)->sum('total_amount') < $coupon->min_total_spent) {
            return 'This coupon is for customers who have spent at least ৳' . $coupon->min_total_spent . '.';
        }

        // every use across all customers
        if ($coupon->usage_limit && $this->usageCount($coupon) >= $coupon->usage_limit) {
            return 'This coupon has reached its usage limit.';
        }

        // this customer's own uses
        if ($coupon->per_user_limit && $this->usageCount($coupon, $user) >= $coupon->per_user_limit) {
            return 'You have already used this coupon.';
        }

        return null;
    }
}
