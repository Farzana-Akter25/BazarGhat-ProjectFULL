<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Extra details for a delivery man account (area, vehicle, stats)
class DeliveryProfile extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'user_id',
        'staff_code',
        'area',
        'vehicle_type',
        'vehicle_number',
        'avatar',
        'rating',
        'on_time_percentage',
        'total_deliveries',
    ];

    // Column type conversions
    protected $casts = [
        'rating' => 'float',
        'on_time_percentage' => 'float',
        'total_deliveries' => 'integer',
    ];

    // The login account of this delivery man
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // All runs assigned to this delivery man
    public function assignments()
    {
        return $this->hasMany(DeliveryAssignment::class);
    }

    // Requests this delivery man has sent
    public function requests()
    {
        return $this->hasMany(DeliveryRequest::class);
    }
}
