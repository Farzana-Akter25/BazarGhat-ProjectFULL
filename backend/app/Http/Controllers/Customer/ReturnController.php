<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\ReturnReason;
use App\Models\ReturnRequest;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

// Customer endpoints for return and refund requests
class ReturnController extends Controller
{
    // List this customer's return/refund requests, newest first
    public function index(Request $request)
    {
        $requests = ReturnRequest::with(['order', 'refunds'])
            ->where('customer_id', $request->user()->id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'requests' => $requests->map(fn (ReturnRequest $r) => $this->present($r)),
        ]);
    }

    // The reason options shown in the request form.
    public function reasons(Request $request)
    {
        // Optional filter: "Return" or "Refund"
        $type = $request->query('type');

        // Active reasons for that type (or for both), in display order
        $reasons = ReturnReason::active()
            ->when(in_array($type, ['Return', 'Refund'], true), fn ($q) => $q->whereIn('applies_to', [$type, 'Both']))
            ->ordered()
            ->pluck('label');

        return response()->json(['reasons' => $reasons]);
    }

    // Which refund destinations the customer may state a preference
    public function refundOptions(Request $request, Order $order, RefundService $refunds)
    {
        // Only the owner of the order may ask
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        // Build an unsaved request just to ask the refund service about this order
        $probe = new ReturnRequest([
            'order_id' => $order->id,
            // The same split store() makes
            'type' => $order->status === 'Cancelled' ? 'Refund' : 'Return',
            'amount' => $order->total_amount,
            'shipping_fee' => 0,
        ]);
        $probe->setRelation('order', $order);

        // What can be refunded and to where
        $context = $refunds->returnRefundContext($probe);

        return response()->json([
            // The most this order can refund under the policy
            'refundableAmount' => $context['refundable_amount'],
            'deliveryCharge' => $context['delivery_charge'],
            'methods' => $context['methods'],
            'gatewayRefundAvailable' => $context['gateway_refund_available'],
            'paymentMethod' => $context['payment_method'],
            'isCod' => $context['is_cod'],
            'note' => $context['reason'],
        ]);
    }

    // Submit a new return or refund request
    public function store(Request $request)
    {
        // Validate the form; returns need an item and photos
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|integer|exists:orders,id',
            'order_item_id' => 'required_if:type,Return|nullable|integer|exists:order_items,id',
            'reason' => 'required|string|max:255',
            'note' => 'nullable|string',
            'type' => 'nullable|string|in:Return,Refund',
            // What the customer wants out of the return
            'resolution' => 'nullable|string|in:Replacement,Refund',
            // Where the customer would like the money if a refund is granted.
            'preferred_refund_method' => 'nullable|string|in:' . Refund::METHOD_WALLET . ',' . Refund::METHOD_ORIGINAL_PAYMENT,
            'photos' => 'required_if:type,Return|nullable|array|max:3',
            'photos.*' => 'image|max:4096',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Load the order; it must belong to this customer
        $order = Order::findOrFail($request->order_id);
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        // "Return" unless the customer asked for a refund
        $type = $request->input('type', 'Return');

        // One request per order
        $existing = ReturnRequest::where('order_id', $order->id)->orderByDesc('id')->first();

        if ($existing) {
            $kind = strtolower($existing->type);

            return response()->json([
                // A cancellation refund writes its own record here without
                'message' => $existing->source === 'System Cancellation'
                    ? 'A refund has already been processed automatically for this order.'
                    : "A {$kind} request ({$existing->request_number}) has already been submitted for this order.",
            ], 422);
        }

        // Store the uploaded photos
        $photoPaths = collect($request->file('photos'))->map(fn ($file) => $file->store('returns', 'public'))->all();

        // Refund request for a whole cancelled order
        if ($type === 'Refund') {
            // Only a customer-cancelled, paid online order qualifies
            $eligible = $order->status === 'Cancelled'
                && $order->cancelled_by === 'customer'
                && $order->payment_method === 'SSLCommerz'
                && $order->payment_status === 'Paid';

            if (! $eligible) {
                return response()->json(['message' => 'This order is not eligible for a refund request.'], 422);
            }

            // Create the refund request with a temporary number
            $returnRequest = ReturnRequest::create([
                'request_number' => 'RET-TMP-' . uniqid(),
                'order_id' => $order->id,
                'order_item_id' => null,
                'customer_id' => $request->user()->id,
                'type' => 'Refund',
                // An order-level refund request has only ever had one outcome.
                'requested_resolution' => 'Refund',
                'product_name' => "Order {$order->order_number}",
                'variant' => null,
                'quantity' => 1,
                'price' => $order->total_amount,
                'reason' => $request->reason,
                'note' => $request->note,
                'photos' => $photoPaths,
                'amount' => $order->total_amount,
                'payment_method' => $order->paymentMethodLabel(),
                'preferred_refund_method' => $request->input('preferred_refund_method'),
                'shipping_fee' => 0,
                'status' => 'Pending',
            ]);

            // Replace it with the real number, e.g. RET-2026-0007
            $returnRequest->update([
                'request_number' => 'RET-' . now()->format('Y') . '-' . str_pad($returnRequest->id, 4, '0', STR_PAD_LEFT),
            ]);

            // Notify the customer and the admins
            $this->announceRequested($returnRequest->fresh(), $order);

            return response()->json([
                'request' => $this->present($returnRequest->fresh(['order', 'refunds'])),
            ], 201);
        }

        // Return request for one item: the item must belong to this order
        $item = OrderItem::findOrFail($request->order_item_id);
        if ($item->order_id !== $order->id) {
            return response()->json(['message' => 'The selected item does not belong to this order.'], 422);
        }

        // Only delivered orders can be returned
        if ($order->status !== 'Delivered') {
            return response()->json(['message' => 'Only delivered orders can be returned.'], 422);
        }

        // Create the return request with a temporary number
        $returnRequest = ReturnRequest::create([
            'request_number' => 'RET-TMP-' . uniqid(),
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'customer_id' => $request->user()->id,
            'type' => 'Return',
            'requested_resolution' => $request->input('resolution', 'Refund'),
            'product_name' => $item->product_name,
            'variant' => null,
            'quantity' => $item->quantity,
            'price' => $item->unit_price,
            'reason' => $request->reason,
            'note' => $request->note,
            'photos' => $photoPaths,
            // what the customer actually paid for this line, after its share of any coupon discount
            'amount' => $order->itemNetAmount($item),
            'payment_method' => $order->paymentMethodLabel() ?? 'Cash on Delivery',
            'preferred_refund_method' => $request->input('preferred_refund_method'),
            'shipping_fee' => 0,
            'status' => 'Pending',
        ]);

        // Replace it with the real number, e.g. RET-2026-0007
        $returnRequest->update([
            'request_number' => 'RET-' . now()->format('Y') . '-' . str_pad($returnRequest->id, 4, '0', STR_PAD_LEFT),
        ]);

        // Notify the customer and the admins
        $this->announceRequested($returnRequest->fresh(), $order);

        return response()->json([
            'request' => $this->present($returnRequest->fresh(['order', 'refunds'])),
        ], 201);
    }

    // Confirms the request to the customer and puts it on the admin queue.
    private function announceRequested(ReturnRequest $returnRequest, $order): void
    {
        // Notification service, the kind of request and the order number
        $notifications = app(NotificationService::class);
        $kind = strtolower($returnRequest->type);
        $number = $order->order_number;

        // Confirm to the customer
        $notifications->send(
            $returnRequest->customer,
            NotificationService::RETURN_REQUESTED,
            ucfirst($kind) . ' requested',
            "Your {$kind} request for order {$number} has been submitted.",
            NotificationService::REF_RETURN,
            $returnRequest->id,
            SystemNotification::PRIORITY_INFO,
        );

        // Tell the admins
        $notifications->sendToAdmins(
            NotificationService::RETURN_REQUESTED,
            'New ' . $kind . ' request',
            "New {$kind} request for order {$number}.",
            NotificationService::REF_RETURN,
            $returnRequest->id,
            SystemNotification::PRIORITY_INFO,
        );
    }

    // Shape a request into the array the customer page uses
    private function present(ReturnRequest $returnRequest): array
    {
        return [
            'id' => $returnRequest->request_number,
            'requestId' => $returnRequest->id,
            'orderId' => $returnRequest->order->order_number,
            'type' => $returnRequest->type,
            'requestedResolution' => $returnRequest->requested_resolution,
            'product' => $returnRequest->product_name,
            'variant' => $returnRequest->variant,
            'qty' => $returnRequest->quantity,
            'price' => $returnRequest->price,
            'reason' => $returnRequest->reason,
            'note' => $returnRequest->note,
            'adminNote' => $returnRequest->admin_note,
            'photos' => $this->photoUrls($returnRequest->photos),
            'amount' => $returnRequest->amount,
            'payment' => $returnRequest->payment_method,
            'shipping' => $returnRequest->shipping_fee,
            'status' => $returnRequest->status,
            'resolution' => $returnRequest->resolution,
            // Where the refund is up to, if one was granted.
            'refundStatus' => $returnRequest->refund_status,
            'refundMethod' => $returnRequest->refund_method,
            'preferredRefundMethod' => $returnRequest->preferred_refund_method,
            'refundId' => $returnRequest->refunds->first()?->id,
            'date' => $returnRequest->created_at->format('Y-m-d'),
            'time' => $returnRequest->created_at->format('h:i A'),
        ];
    }

    // Turn stored photo paths into full public URLs
    private function photoUrls(?array $photos): array
    {
        return collect($photos ?? [])
            ->map(fn (string $path) => Str::startsWith($path, ['http://', 'https://']) ? $path : Storage::disk('public')->url($path))
            ->all();
    }
}
