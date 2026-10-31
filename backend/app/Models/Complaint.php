<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A complaint filed by a customer or a delivery man
class Complaint extends Model
{
    use HasFactory;

    // Every status a complaint can have
    public const STATUSES = [
        'Pending',
        'Under Review',
        'Waiting for Response',
        'Resolved',
        'Rejected',
        'Closed',
    ];

    // Columns that may be mass-assigned
    protected $fillable = [
        'complaint_number',
        'complaint_type',
        'filer_name',
        'filer_code',
        'against_name',
        'against_code',
        'order_id',
        'order_reference',
        'reason',
        'status',
        'waiting_on',
        'resolution_note',
        'decided_at',
        'closed_at',
        'hidden_from_customer_at',
        'hidden_from_delivery_at',
    ];

    // Columns read back as dates
    protected $casts = [
        'decided_at' => 'datetime',
        'closed_at' => 'datetime',
        'hidden_from_customer_at' => 'datetime',
        'hidden_from_delivery_at' => 'datetime',
    ];

    // The order the complaint is about
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // Status timeline entries, oldest first
    public function history()
    {
        return $this->hasMany(ComplaintStatusHistory::class)->orderBy('created_at');
    }

    // True when the complaint is closed
    public function isClosed(): bool
    {
      return $this->status === 'Closed';
    }

    // The customer on the complaint's order
    public function customerUser(): ?User
    {
        return $this->order?->customer;
    }

    // The delivery man assigned to the complaint's order
    public function deliveryManUser(): ?User
    {
        return $this->order?->deliveryAssignment?->deliveryProfile?->user;
    }
}
