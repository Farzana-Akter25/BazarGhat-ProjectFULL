<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// One entry in a refund's audit trail.
class RefundLog extends Model
{
    // Columns that may be mass-assigned
    protected $fillable = [
        'refund_id',
        'event',
        'from_status',
        'to_status',
        'message',
        'context',
    ];

    // Extra details stored as JSON
    protected $casts = [
        'context' => 'array',
    ];

    // The refund this entry belongs to
    public function refund()
    {
        return $this->belongsTo(Refund::class);
    }
}
