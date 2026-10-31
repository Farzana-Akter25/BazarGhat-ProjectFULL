<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// The invoice issued for an order
class Invoice extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'invoice_number',
        'order_id',
        'issued_at',
    ];

    // Column type conversions
    protected $casts = [
        'issued_at' => 'datetime',
    ];

    // The order this invoice is for
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
