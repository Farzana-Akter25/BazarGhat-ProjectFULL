<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// One product line in a customer's cart
class CartItem extends Model
{
    // Columns that may be mass-assigned
    protected $fillable = [
        'user_id',
        'product_id',
        'quantity',
    ];

    // Column type conversions
    protected $casts = [
        'quantity' => 'integer',
    ];

    // The product in this cart line
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // The customer who owns this cart line
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Remove the given products from a user's cart
    public static function removeForUserProducts(int $userId, array $productIds): void
    {
        if (empty($productIds)) {
            return;
        }

        self::where('user_id', $userId)->whereIn('product_id', $productIds)->delete();
    }
}
