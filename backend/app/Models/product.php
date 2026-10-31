<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A product sold in the shop
class Product extends Model
{
    use HasFactory;

    // Database table name
    protected $table = 'products';

    // Columns that may be mass-assigned
    protected $fillable = [
        'name',
        'description',
        'category',
        'unit',
        'price',
        'original_price',
        'discount',
        'stock',
        'damaged_stock',
        'image',
        'status',
    ];

    // Column type conversions
    protected $casts = [
        'price' => 'integer',
        'original_price' => 'integer',
        'discount' => 'integer',
        'stock' => 'integer',
        'damaged_stock' => 'integer',
    ];

    // Order lines that include this product
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Stock change log for this product
    public function stockTransactions()
    {
        return $this->hasMany(StockTransaction::class);
    }

    // Flash sales this product is in
    public function flashSaleProducts()
    {
        return $this->hasMany(FlashSaleProduct::class);
    }

    // Stock label: "Out of Stock" at 0, "Low Stock" under 20, otherwise "Active"
    public function statusLabel(): string
    {
        if ($this->stock <= 0) {
            return 'Out of Stock';
        }

        if ($this->stock < 20) {
            return 'Low Stock';
        }

        return 'Active';
    }
}
