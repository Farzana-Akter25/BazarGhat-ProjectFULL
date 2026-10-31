<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// An order (or return pickup) given to a delivery man
class DeliveryAssignment extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'order_id',
        'delivery_profile_id',
        'area',
        // 'Delivery' (the usual run) or 'Return Pickup'
        'type',
        'status',
        'rider_status',
        'rejection_reason',
        'assigned_at',
        'accepted_at',
        'completed_at',
    ];

    // Columns read back as dates
    protected $casts = [
        'assigned_at' => 'datetime',
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    // The order being delivered or collected
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // The delivery man doing the run
    public function deliveryProfile()
    {
        return $this->belongsTo(DeliveryProfile::class);
    }

    // Problem reports filed on this run
    public function issueReports()
    {
        return $this->hasMany(DeliveryIssueReport::class);
    }
}
