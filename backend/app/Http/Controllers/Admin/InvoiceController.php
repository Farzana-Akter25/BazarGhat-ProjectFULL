<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Order;
use App\Services\InvoiceService;
use Carbon\Carbon;
use Illuminate\Http\Request;

// Admin-only invoice monitoring: view, search, filter, download, print.
class InvoiceController extends Controller
{
    // Inject the invoice service
    public function __construct(private InvoiceService $invoices)
    {
    }

    // List invoices with an optional date range, plus summary and daily totals
    public function index(Request $request)
    {
        // Make sure every confirmed order has an invoice before listing
        $this->invoices->backfillConfirmed();

        // Optional from/to date filter
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
        ]);

        // Turn the dates into full-day boundaries
        $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : null;

        // Load invoices with their order, items, customer and refunds
        $invoices = Invoice::with(['order.items', 'order.customer', 'order.refunds'])
            // An online order whose payment never landed is not an order
            ->whereHas('order', fn ($q) => $q->placed())
            ->when($from, fn ($q) => $q->where('issued_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('issued_at', '<=', $to))
            ->orderByDesc('id')
            ->get();

        // Send the list, the summary, the daily breakdown and the chosen period
        return response()->json([
            'invoices' => $invoices->map(fn (Invoice $i) => $this->present($i)),
            'summary' => $this->buildSummary($invoices),
            'dailyBreakdown' => $this->buildDailyBreakdown($invoices, $from, $to),
            'period' => [
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
            ],
        ]);
    }

    // Cancelled orders keep their invoice
    private function buildSummary($invoices): array
    {
        // Payment status of each invoice, and a helper to total amounts by status
        $statuses = $invoices->map(fn (Invoice $i) => InvoiceService::paymentStatus($i->order));
        $amountByStatus = fn (string $status) => $invoices
            ->filter(fn (Invoice $i) => InvoiceService::paymentStatus($i->order) === $status)
            ->sum(fn (Invoice $i) => (int) $i->order->total_amount);

        $paidAmount = $amountByStatus('Paid');
        $unpaidAmount = $amountByStatus('Unpaid');
        $refundedAmount = $amountByStatus('Refunded');
        $cancelledAmount = $amountByStatus('Cancelled');

        // Count and amount for each payment status
        $statusSummary = collect(['Paid', 'Unpaid', 'Refunded', 'Cancelled'])->map(fn ($status) => [
            'status' => $status,
            'count' => $statuses->filter(fn ($s) => $s === $status)->count(),
            'amount' => $amountByStatus($status),
        ])->values();

        // Count and amount for each payment method
        $paymentMethodSummary = $invoices
            ->groupBy(fn (Invoice $i) => InvoiceService::paymentMethodBucket($i->order))
            ->map(fn ($group, $method) => [
                'method' => $method,
                'count' => $group->count(),
                'amount' => $group->sum(fn (Invoice $i) => (int) $i->order->total_amount),
            ])
            ->values();

        // Totals shown on the summary cards
        return [
            'total' => $invoices->count(),
            'paid' => $statuses->filter(fn ($s) => $s === 'Paid')->count(),
            'pendingUnpaid' => $statuses->filter(fn ($s) => $s === 'Unpaid')->count(),
            'totalAmount' => $invoices->sum(fn (Invoice $i) => (int) $i->order->total_amount),
            'totalOrders' => $invoices->count(),
            'totalSales' => $invoices->sum(fn (Invoice $i) => (int) $i->order->total_amount),
            'totalDiscount' => $invoices->sum(fn (Invoice $i) => (int) $i->order->discount),
            'deliveryFee' => $invoices->sum(fn (Invoice $i) => $this->deliveryFee($i->order)),
            'netRevenue' => $paidAmount - $refundedAmount,
            'paidAmount' => $paidAmount,
            'unpaidAmount' => $unpaidAmount,
            'refundedAmount' => $refundedAmount,
            'cancelledAmount' => $cancelledAmount,
            'paymentMethodSummary' => $paymentMethodSummary,
            'statusSummary' => $statusSummary,
        ];
    }

    // Zero-filled per-day rows across the whole selected range
    private function buildDailyBreakdown($invoices, ?Carbon $from, ?Carbon $to): array
    {
        // Group invoices by the day they were issued
        $byDate = $invoices->groupBy(fn (Invoice $i) => $i->issued_at->toDateString());

        // Use the chosen range, or fall back to the first and last invoice dates
        $rangeStart = $from ?? $invoices->min(fn (Invoice $i) => $i->issued_at)?->copy()->startOfDay();
        $rangeEnd = $to ?? $invoices->max(fn (Invoice $i) => $i->issued_at)?->copy()->startOfDay();

        if (! $rangeStart || ! $rangeEnd) {
            return [];
        }

        // One row per day, even if no invoices were issued that day
        $days = [];
        for ($cursor = $rangeStart->copy()->startOfDay(); $cursor->lte($rangeEnd); $cursor->addDay()) {
            $dateKey = $cursor->toDateString();
            $dayInvoices = $byDate->get($dateKey, collect());

            $days[] = [
                'date' => $dateKey,
                'invoiceCount' => $dayInvoices->count(),
                'orderCount' => $dayInvoices->count(),
                'subtotal' => $dayInvoices->sum(fn (Invoice $i) => (int) $i->order->subtotal),
                'discount' => $dayInvoices->sum(fn (Invoice $i) => (int) $i->order->discount),
                'deliveryFee' => $dayInvoices->sum(fn (Invoice $i) => $this->deliveryFee($i->order)),
                'totalSales' => $dayInvoices->sum(fn (Invoice $i) => (int) $i->order->total_amount),
            ];
        }

        return $days;
    }

    // Delivery fee = total - subtotal + discount (never below zero)
    private function deliveryFee(Order $order): int
    {
        return max((int) $order->total_amount - (int) $order->subtotal + (int) $order->discount, 0);
    }

    // Show one order's full invoice
    public function show(Order $order)
    {
        $invoice = $order->invoice;

        // Same safety net index() gets from backfillConfirmed().
        if (! $invoice && $order->statusHistories()->where('status', 'Confirmed')->exists()) {
            $invoice = $this->invoices->generateForOrder($order);
        }

        abort_if(! $invoice, 404, 'No invoice has been generated for this order yet.');

        $invoice->setRelation('order', $order->load(['items.product', 'customer', 'refunds']));

        return response()->json(['invoice' => $this->presentDetail($invoice)]);
    }

    // Shape an invoice into a row for the invoice list
    private function present(Invoice $invoice): array
    {
        $order = $invoice->order;

        return [
            'id' => $invoice->invoice_number,
            'invoiceId' => $order->id,
            'orderId' => $order->order_number,
            'customer' => $order->customer_name,
            'invoiceDate' => $invoice->issued_at->format('Y-m-d'),
            'paymentMethod' => InvoiceService::paymentMethodBucket($order),
            'paymentStatus' => InvoiceService::displayPaymentStatus($order),
            'amount' => (int) $order->total_amount,
            // money already returned to the customer against this invoice
            'refundedAmount' => InvoiceService::refundedAmount($order),
        ];
    }

    // Shape an invoice with full order details for the invoice view
    private function presentDetail(Invoice $invoice): array
    {
        $order = $invoice->order;
        $delivery = $this->deliveryFee($order);

        return [
            'id' => $invoice->invoice_number,
            'orderId' => $order->order_number,
            'invoiceDate' => $invoice->issued_at->format('Y-m-d'),
            'customer' => $order->customer_name,
            'phone' => $order->customer_phone,
            'shippingAddress' => $order->shipping_address,
            'orderStatus' => $order->status,
            'paymentMethod' => $order->paymentMethodLabel(),
            'paymentStatus' => InvoiceService::displayPaymentStatus($order),
            // money already returned to the customer against this invoice
            'refundedAmount' => InvoiceService::refundedAmount($order),
            // The gateway's own bank_tran_id once SSLCommerz has reported it
            'transactionId' => $order->gateway_transaction_id ?: $order->transaction_id,
            'deliveryMan' => InvoiceService::deliveryMan($order),
            'subtotal' => (int) $order->subtotal,
            'discount' => (int) $order->discount,
            'delivery' => $delivery,
            'amount' => (int) $order->total_amount,
            // Same split the customer sees
            'walletAmount' => (int) $order->wallet_amount,
            'gatewayAmount' => $order->gatewayPayable(),
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->product_name,
                // pack size the product is sold in
                'unit' => $item->product?->unit,
                'qty' => $item->quantity,
                'price' => $item->unit_price,
                'discount' => 0,
                'lineTotal' => $item->line_total,
            ]),
        ];
    }
}
