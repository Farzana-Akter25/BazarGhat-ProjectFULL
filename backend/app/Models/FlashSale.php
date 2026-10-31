<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

// A time-limited sale on a set of products
class FlashSale extends Model
{
    use HasFactory;

    // The `status` column records admin intent only
    public const STATUS_ACTIVE = 'Active';

    public const STATUS_INACTIVE = 'Inactive';

    public const PHASE_UPCOMING = 'upcoming';

    public const PHASE_ACTIVE = 'active';

    public const PHASE_EXPIRED = 'expired';

    public const PHASE_INACTIVE = 'inactive';

    // Columns that may be mass-assigned
    protected $fillable = [
        'name',
        'discount_type',
        'discount_value',
        'start_at',
        'end_at',
        'status',
    ];

    // Column type conversions
    protected $casts = [
        'discount_value' => 'integer',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
    ];

    // The sale-price rows for this sale
    public function flashSaleProducts(): HasMany
    {
        return $this->hasMany(FlashSaleProduct::class);
    }

    // The products in this sale, with their sale price
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'flash_sale_products')
            ->withPivot('sale_price')
            ->withTimestamps();
    }

    // Switched on, started, and not yet ended — the
    public function scopeActive(Builder $query, ?Carbon $at = null): Builder
    {
        $at = $at ?: now();

        return $query->where('status', self::STATUS_ACTIVE)
            ->where('start_at', '<=', $at)
            ->where('end_at', '>=', $at);
    }

    // Switched on and not yet ended (running now or starting later)
    public function scopeUpcomingOrActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE)->where('end_at', '>=', now());
    }

    // Narrow a query to one derived phase, for the admin's status tabs.
    public function scopeInPhase(Builder $query, string $phase): Builder
    {
        $now = now();

        return match ($phase) {
            self::PHASE_UPCOMING => $query->where('status', self::STATUS_ACTIVE)->where('start_at', '>', $now),
            self::PHASE_ACTIVE => $query->active($now),
            self::PHASE_EXPIRED => $query->where('status', self::STATUS_ACTIVE)->where('end_at', '<', $now),
            self::PHASE_INACTIVE => $query->where('status', self::STATUS_INACTIVE),
            default => $query,
        };
    }

    // True once the start time has passed
    public function hasStarted(): bool
    {
        return $this->start_at->isPast();
    }

    // True once the end time has passed
    public function hasEnded(): bool
    {
        return $this->end_at->isPast();
    }

    // True while switched on and inside its time window
    public function isRunning(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->hasStarted() && ! $this->hasEnded();
    }

    // upcoming | active | expired | inactive — recomputed on every read.
    public function phase(): string
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return self::PHASE_INACTIVE;
        }

        if (! $this->hasStarted()) {
            return self::PHASE_UPCOMING;
        }

        if ($this->hasEnded()) {
            return self::PHASE_EXPIRED;
        }

        return self::PHASE_ACTIVE;
    }
}
