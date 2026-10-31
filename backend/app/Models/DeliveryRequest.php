<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A request (e.g. day off) sent by a delivery man
class DeliveryRequest extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'delivery_profile_id',
        'delivery_assignment_id',
        'type',
        'message',
        'status',
    ];

    // The delivery man who sent it
    public function deliveryProfile()
    {
        return $this->belongsTo(DeliveryProfile::class);
    }

    // The run it relates to, if any
    public function assignment()
    {
        return $this->belongsTo(DeliveryAssignment::class, 'delivery_assignment_id');
    }
}
