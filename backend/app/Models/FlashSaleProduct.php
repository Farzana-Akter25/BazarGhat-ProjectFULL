<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// One product in a flash sale and its sale price
class FlashSaleProduct extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'flash_sale_id',
        'product_id',
        'sale_price',
    ];

    // Column type conversions
    protected $casts = [
        'sale_price' => 'integer',
    ];

    // The sale this row belongs to
    public function flashSale()
    {
        return $this->belongsTo(FlashSale::class);
    }

    // The product on sale
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
