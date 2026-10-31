<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// One entry in an order's status timeline
class OrderStatusHistory extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'order_id',
        'status',
        'note',
        'changed_by_user_id',
        'changed_by_role',
    ];

    // The order this entry belongs to
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // The user who made this change
    public function actor()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
