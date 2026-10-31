<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// One entry in a complaint's status timeline
class ComplaintStatusHistory extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'complaint_id',
        'status',
        'note',
        'photos',
        'changed_by_user_id',
        'changed_by_role',
    ];

    // Photos are stored as a JSON array
    protected $casts = [
        'photos' => 'array',
    ];

    // The complaint this entry belongs to
    public function complaint()
    {
        return $this->belongsTo(Complaint::class);
    }

    // The user who made this change
    public function actor()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
