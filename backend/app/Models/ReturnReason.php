<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A reason customers can choose on a return/refund request
class ReturnReason extends Model
{
    use HasFactory;

    // Columns that may be mass-assigned
    protected $fillable = [
        'label',
        'applies_to',
        'is_active',
        'sort_order',
    ];

    // Column type conversions
    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    // Active reasons in display order — what the customer request form shows.
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Sort by display order, then by id
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
