<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// A log entry for every change to a product's stock
class StockTransaction extends Model
{
    use HasFactory;

    // Units put back on the shelf because the order they were taken for was cancelled
    public const TYPE_ORDER_CANCELLED_RETURN = 'Order Cancelled Return';
    public const TYPE_DOORSTEP_REJECTION_RETURN = 'Doorstep Rejection Return';
    public const TYPE_DOORSTEP_REJECTION_DAMAGED = 'Damaged from Doorstep Rejection';
    public const TYPE_RETURN_APPROVED = 'Return Approved';
    public const TYPE_RETURN_APPROVAL_REVERSED = 'Return Approval Reversed';
    // Returned goods physically checked in and found saleable.
    public const TYPE_RETURN_RECEIVED_RESTOCK = 'Returned Stock Received';
    // Returned goods physically checked in and written off as damaged.
    public const TYPE_RETURN_RECEIVED_DAMAGED = 'Returned Stock Damaged';
    public const TYPE_REPLACEMENT_DEDUCTION = 'Replacement Deduction';
    public const TYPE_MANUAL_ADJUSTMENT = 'Manual Inventory Adjustment';

    // Columns that may be mass-assigned
    protected $fillable = [
        'product_id',
        'order_id',
        'delivery_assignment_id',
        'transaction_type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reason',
        'created_by',
    ];

    // Column type conversions
    protected $casts = [
        'quantity' => 'integer',
        'previous_stock' => 'integer',
        'new_stock' => 'integer',
    ];

    // The product whose stock changed
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // The order involved, if any
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // The delivery run involved, if any
    public function deliveryAssignment()
    {
        return $this->belongsTo(DeliveryAssignment::class);
    }

    // The user who made the change
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
