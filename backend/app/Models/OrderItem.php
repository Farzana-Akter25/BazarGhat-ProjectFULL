<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// One product line on an order
class OrderItem extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'unit_price',
        'quantity',
        'line_total',
    ];

    // Column type conversions
    protected $casts = [
        'unit_price' => 'integer',
        'quantity' => 'integer',
        'line_total' => 'integer',
    ];

    // The order this line belongs to
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // The product that was ordered
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
