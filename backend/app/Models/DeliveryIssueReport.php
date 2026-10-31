<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A problem report filed by a delivery man on a run
class DeliveryIssueReport extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'delivery_assignment_id',
        'delivery_profile_id',
        'condition',
        'comment',
        'photo',
    ];

    // The run the report is about
    public function deliveryAssignment()
    {
        return $this->belongsTo(DeliveryAssignment::class);
    }

    // The delivery man who filed it
    public function deliveryProfile()
    {
        return $this->belongsTo(DeliveryProfile::class);
    }
}
