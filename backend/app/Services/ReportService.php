<?php

namespace App\Services;

use App\Models\DeliveryAssignment;
use App\Models\Order;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\product as Product;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Builds the admin business performance report for a date range.
class ReportService
{
    // Stock at or below this reads as "Low Stock"
    private const LOW_STOCK_THRESHOLD = 20;

    // What a rider earns per delivered order
    private const EARNING_PER_ORDER = 80;

    // How many rows the top products and top customers tables show
    private const TOP_PRODUCT_LIMIT = 10;

    private const TOP_CUSTOMER_LIMIT = 5;

    // Build every section of the report for the given period
    public function build(CarbonImmutable $from, CarbonImmutable $to, string $reportType, ?User $generatedBy): array
    {
        // Orders placed and refunds completed inside the period
        $orders = $this->ordersInRange($from, $to);
        $refunds = $this->completedRefundsInRange($from, $to);
        // Every sales figure works from the refunds that belong to a counted sale
        $salesRefunds = $this->countableRefunds($orders, $refunds);

        // Each key is one section of the report
        return [
            'meta' => $this->meta($from, $to, $reportType, $generatedBy),
            'sales' => $this->sales($orders, $salesRefunds),
            'summary' => $this->executiveSummary($orders, $salesRefunds, $from, $to),
            'orders' => $this->orderSummary($orders),
            'payments' => $this->paymentSummary($orders),
            'products' => $this->topProducts($from, $to),
            'categories' => $this->categoryPerformance($from, $to),
            'coupons' => $this->couponSummary($from, $to),
            'returns' => $this->returnSummary($from, $to, $refunds),
            'wallet' => $this->walletSummary($from, $to, $orders),
            'delivery' => $this->deliverySummary($from, $to),
            'customers' => $this->customerSummary($orders, $from),
            'inventory' => $this->inventorySummary(),
            'dailySales' => $this->dailySales($orders, $salesRefunds, $from, $to),
            'kpis' => $this->kpis($orders, $salesRefunds),
        ];
    }

    // The orders a report is built from
    private function ordersInRange(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return Order::placed()
            ->whereBetween('created_at', [$from, $to])
            ->get([
                'id', 'user_id', 'status', 'payment_status', 'payment_method',
                'payment_channel', 'payment_gateway', 'subtotal', 'discount',
                'wallet_amount', 'total_amount', 'created_at',
            ]);
    }

    // Money actually returned inside the period.
    private function completedRefundsInRange(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return Refund::where('status', Refund::STATUS_COMPLETED)
            ->whereBetween('completed_at', [$from, $to])
            ->get(['id', 'order_id', 'amount', 'refund_method', 'completed_at']);
    }

    // Refunds that may be taken off a sales figure
    private function countableRefunds(Collection $orders, Collection $refunds): Collection
    {
        $soldIds = $orders->where('status', '!=', 'Cancelled')->pluck('id')->all();

        return $refunds->whereIn('order_id', $soldIds);
    }

    // Report header details
    private function meta(CarbonImmutable $from, CarbonImmutable $to, string $reportType, ?User $generatedBy): array
    {
        return [
            // Derived from the period rather than stored
            'reportNumber' => 'BG-RPT-' . $from->format('Y') . '-' . $from->format('md') . $to->format('md'),
            'reportType' => $reportType,
            'startDate' => $from->toDateString(),
            'endDate' => $to->toDateString(),
            'generatedAt' => now()->toIso8601String(),
            'generatedBy' => $generatedBy?->name ?: 'Admin',
            'dayCount' => $from->diffInDays($to) + 1,
        ];
    }

    // Gross - Discount + Delivery - Refund = Net Sales
    private function sales(Collection $orders, Collection $refunds): array
    {
        // A cancelled order sold nothing
        $sold = $orders->where('status', '!=', 'Cancelled');

        // Totals for the sold orders
        $gross = (int) $sold->sum('subtotal');
        $discount = (int) $sold->sum('discount');
        $delivery = (int) $sold->sum(fn (Order $o) => $this->deliveryFee($o));
        $refunded = (int) $refunds->sum('amount');

        return [
            'grossProductSales' => $gross,
            'totalDiscount' => $discount,
            'deliveryFee' => $delivery,
            'totalRefund' => $refunded,
            'netSales' => $gross - $discount + $delivery - $refunded,
        ];
    }

    // Delivery fee = total - subtotal + discount (never below zero)
    private function deliveryFee(Order $order): int
    {
        return max((int) $order->total_amount - (int) $order->subtotal + (int) $order->discount, 0);
    }

    // Short overview: sales, order counts, customers, products and KPIs
    private function executiveSummary(Collection $orders, Collection $refunds, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $customers = $this->customerSummary($orders, $from);
        $products = $this->soldProductTotals($from, $to);

        return [
            'sales' => $this->sales($orders, $refunds),
            'orders' => [
                'total' => $orders->count(),
                'delivered' => $orders->where('status', 'Delivered')->count(),
                'cancelled' => $orders->where('status', 'Cancelled')->count(),
                'returned' => $orders->where('status', 'Returned')->count(),
                'pending' => $orders->where('status', 'Pending')->count(),
            ],
            'customers' => [
                'ordered' => $customers['ordered'],
                'new' => $customers['new'],
                'returning' => $customers['returning'],
            ],
            'products' => $products,
            'kpis' => $this->kpis($orders, $refunds),
        ];
    }

    // Units sold and how many distinct products those units covered.
    private function soldProductTotals(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $row = $this->orderItemQuery($from, $to)
            ->selectRaw('COALESCE(SUM(order_items.quantity), 0) as qty, COUNT(DISTINCT order_items.product_id) as products')
            ->first();

        return [
            'unitsSold' => (int) ($row->qty ?? 0),
            'distinctProducts' => (int) ($row->products ?? 0),
        ];
    }

    // Orders grouped by status with count, amount and share
    private function orderSummary(Collection $orders): array
    {
        // Avoid dividing by zero
        $total = max(1, $orders->count());

        $rows = $orders
            ->groupBy('status')
            ->map(fn (Collection $group, string $status) => [
                'status' => $status,
                'orders' => $group->count(),
                'amount' => (int) $group->sum('total_amount'),
                'percentage' => round(($group->count() / $total) * 100, 1),
            ])
            ->sortByDesc('orders')
            ->values()
            ->all();

        return [
            'rows' => $rows,
            'total' => $orders->count(),
            'totalAmount' => (int) $orders->sum('total_amount'),
        ];
    }

    // Payment analysis that never double-counts a split payment.
    private function paymentSummary(Collection $orders): array
    {
        // Balance used at checkout across all orders
        $walletUsed = (int) $orders->sum('wallet_amount');

        // Group by payment method and total the amounts
        $byMethod = $orders
            ->groupBy(fn (Order $o) => $o->paymentMethodLabel() ?: 'Other')
            ->map(fn (Collection $group, string $method) => [
                'method' => $method,
                'orders' => $group->count(),
                // the part this method was actually asked for, balance excluded
                'amount' => (int) $group->sum(fn (Order $o) => $o->gatewayPayable()),
                'collected' => (int) $group
                    ->where('payment_status', 'Paid')
                    ->sum(fn (Order $o) => $o->gatewayPayable()),
            ])
            ->values();

        // Add the wallet as its own row
        if ($walletUsed > 0) {
            $byMethod->push([
                'method' => 'Refund Wallet',
                'orders' => $orders->where('wallet_amount', '>', 0)->count(),
                'amount' => $walletUsed,
                // balance is settled inside BazarGhat
                'collected' => $walletUsed,
            ]);
        }

        // Share of each method in the total
        $grandTotal = max(1, (int) $byMethod->sum('amount'));
        $rows = $byMethod
            ->map(fn (array $row) => [
                ...$row,
                'percentage' => round(($row['amount'] / $grandTotal) * 100, 1),
            ])
            ->sortByDesc('amount')
            ->values()
            ->all();

        // Online and cash on delivery orders
        $online = $orders->where('payment_method', 'SSLCommerz');
        $cod = $orders->where('payment_method', 'Cash on Delivery');

        return [
            'rows' => $rows,
            'totalOnline' => (int) $online->where('payment_status', 'Paid')->sum(fn (Order $o) => $o->gatewayPayable()),
            'totalCod' => (int) $cod->where('payment_status', 'Paid')->sum(fn (Order $o) => $o->gatewayPayable()),
            'totalWallet' => $walletUsed,
            // What the period's orders are worth in total
            'totalOrderValue' => (int) $orders->sum('total_amount'),
        ];
    }

    // Base query for line items belonging to placed orders inside the period.
    private function orderItemQuery(CarbonImmutable $from, CarbonImmutable $to)
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            // Units on a cancelled order went back on the shelf
            ->where('orders.status', '!=', 'Cancelled')
            ->where(fn ($q) => $q
                ->where('orders.payment_gateway', '!=', 'SSLCOMMERZ')
                ->orWhereNull('orders.payment_gateway')
                ->orWhere('orders.payment_status', 'Paid')
                ->orWhere('orders.status', 'Cancelled'));
    }

    // An order's discount is recorded once for the whole order
    private function discountAllocationExpression(): string
    {
        return 'SUM(order_items.line_total * LEAST(COALESCE(orders.discount, 0), orders.subtotal) / NULLIF(orders.subtotal, 0))';
    }

    // Best-selling products by sales value
    private function topProducts(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->orderItemQuery($from, $to)
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->groupBy('order_items.product_id', 'order_items.product_name', 'products.category', 'products.unit')
            ->select([
                'order_items.product_id',
                'order_items.product_name',
                'products.category',
                'products.unit',
                DB::raw('SUM(order_items.quantity) as qty_sold'),
                DB::raw('SUM(order_items.line_total) as gross_sales'),
                DB::raw($this->discountAllocationExpression() . ' as discount_share'),
            ])
            ->orderByDesc('gross_sales')
            ->limit(self::TOP_PRODUCT_LIMIT)
            ->get();

        // Rank each product and work out net sales after its share of discount
        return $rows->values()->map(function ($row, int $index) {
            $gross = (int) round($row->gross_sales);
            $discount = (int) round($row->discount_share ?? 0);

            return [
                'rank' => $index + 1,
                'product' => $row->product_name,
                'unit' => $row->unit,
                'category' => $row->category ?: 'Uncategorised',
                'qtySold' => (int) $row->qty_sold,
                'grossSales' => $gross,
                'discount' => $discount,
                'netSales' => $gross - $discount,
            ];
        })->all();
    }

    // Sales per product category
    private function categoryPerformance(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->orderItemQuery($from, $to)
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->groupBy('products.category')
            ->select([
                'products.category',
                DB::raw('COUNT(DISTINCT order_items.product_id) as products_sold'),
                DB::raw('SUM(order_items.quantity) as qty_sold'),
                DB::raw('SUM(order_items.line_total) as gross_sales'),
                DB::raw($this->discountAllocationExpression() . ' as discount_share'),
            ])
            ->orderByDesc('gross_sales')
            ->get();

        // Total used for each category's share
        $totalGross = max(1, (int) $rows->sum('gross_sales'));

        return $rows->map(function ($row) use ($totalGross) {
            $gross = (int) round($row->gross_sales);
            $discount = (int) round($row->discount_share ?? 0);

            return [
                'category' => $row->category ?: 'Uncategorised',
                'productsSold' => (int) $row->products_sold,
                'qtySold' => (int) $row->qty_sold,
                'grossSales' => $gross,
                'discount' => $discount,
                'netSales' => $gross - $discount,
                'percentage' => round(($gross / $totalGross) * 100, 1),
            ];
        })->all();
    }

    // Coupon usage in the period
    private function couponSummary(CarbonImmutable $from, CarbonImmutable $to): array
    {
        // All coupon uses in the period with their coupon details
        $usages = DB::table('coupon_usages')
            ->join('coupons', 'coupons.id', '=', 'coupon_usages.coupon_id')
            ->whereBetween('coupon_usages.created_at', [$from, $to])
            ->select([
                'coupons.coupon_code',
                'coupons.campaign_name',
                'coupons.coupon_type',
                'coupons.audience',
                'coupon_usages.discount_amount',
                'coupon_usages.free_delivery',
                'coupon_usages.order_id',
            ])
            ->get();

        // One row per coupon code
        $rows = $usages
            ->groupBy('coupon_code')
            ->map(fn (Collection $group, string $code) => [
                'code' => $code,
                'campaign' => $group->first()->campaign_name,
                'type' => $group->first()->coupon_type,
                'orders' => $group->pluck('order_id')->unique()->count(),
                'discount' => (int) $group->sum('discount_amount'),
                'freeDeliveryOrders' => $group->where('free_delivery', 1)->count(),
            ])
            ->sortByDesc('orders')
            ->values()
            ->all();

        return [
            'rows' => $rows,
            'ordersWithCoupon' => $usages->pluck('order_id')->unique()->count(),
            'totalDiscount' => (int) $usages->sum('discount_amount'),
            'freeDeliveryOrders' => $usages->where('free_delivery', 1)->count(),
            // "selected" is the audience a customer-specific coupon carries
            'customerSpecificUsage' => $usages->where('audience', 'selected')->count(),
            'generalUsage' => $usages->where('audience', '!=', 'selected')->count(),
        ];
    }

    // Return/refund requests made in the period and refunds paid
    private function returnSummary(CarbonImmutable $from, CarbonImmutable $to, Collection $refunds): array
    {
        // Requests created in the period
        $requests = ReturnRequest::whereBetween('created_at', [$from, $to])->get(['id', 'status', 'amount']);

        // Helper to total refunds by method
        $byMethod = fn (string $method) => (int) $refunds->where('refund_method', $method)->sum('amount');

        return [
            'totalRequests' => $requests->count(),
            'pending' => $requests->where('status', 'Pending')->count(),
            'inReview' => $requests->where('status', 'In Review')->count(),
            'approved' => $requests->where('status', 'Approved')->count(),
            'rejected' => $requests->where('status', 'Rejected')->count(),
            'completed' => $requests->where('status', 'Completed')->count(),
            'totalRefundAmount' => (int) $refunds->sum('amount'),
            // ORIGINAL_PAYMENT goes back the way it came
            'gatewayRefund' => $byMethod('ORIGINAL_PAYMENT'),
            'walletRefund' => $byMethod('WALLET'),
            'refundCount' => $refunds->count(),
        ];
    }

    // Wallet activity in the period
    private function walletSummary(CarbonImmutable $from, CarbonImmutable $to, Collection $orders): array
    {
        // Wallet transactions in the period
        $transactions = WalletTransaction::whereBetween('created_at', [$from, $to])
            ->get(['type', 'amount', 'reference_type']);

        return [
            // Balance spent at checkout
            'totalWalletUsed' => (int) $orders->sum('wallet_amount'),
            'totalWalletRefund' => (int) $transactions
                ->where('type', 'CREDIT')
                ->where('reference_type', 'refund')
                ->sum('amount'),
            'totalCredit' => (int) $transactions->where('type', 'CREDIT')->sum('amount'),
            'totalDebit' => (int) $transactions->where('type', 'DEBIT')->sum('amount'),
            'transactionCount' => $transactions->count(),
        ];
    }

    // Delivery runs created in the period
    private function deliverySummary(CarbonImmutable $from, CarbonImmutable $to): array
    {
        // Runs with their delivery man
        $assignments = DeliveryAssignment::with('deliveryProfile.user')
            ->whereBetween('created_at', [$from, $to])
            ->get(['id', 'delivery_profile_id', 'status', 'rider_status', 'accepted_at', 'completed_at']);

        // Helper to count runs by rider status
        $countRider = fn (string $status) => $assignments->where('rider_status', $status)->count();

        // Per-rider totals, best performer first
        $riders = $assignments
            ->filter(fn (DeliveryAssignment $a) => $a->deliveryProfile?->user)
            ->groupBy(fn (DeliveryAssignment $a) => $a->deliveryProfile->user->name)
            ->map(fn (Collection $group, string $name) => [
                'name' => $name,
                'assigned' => $group->count(),
                'accepted' => $group->filter(fn (DeliveryAssignment $a) => $a->accepted_at !== null)->count(),
                'delivered' => $group->where('rider_status', 'Delivered')->count(),
                'pending' => $group->whereNotIn('rider_status', ['Delivered', 'Failed'])->count(),
            ])
            ->sortByDesc('delivered')
            ->values()
            ->all();

        $delivered = $countRider('Delivered');

        return [
            'totalAssigned' => $assignments->count(),
            'accepted' => $assignments->filter(fn (DeliveryAssignment $a) => $a->accepted_at !== null)->count(),
            'onTheWay' => $countRider('Out for Delivery'),
            'pickedUp' => $countRider('Picked Up'),
            'delivered' => $delivered,
            'pending' => $assignments->whereNotIn('rider_status', ['Delivered', 'Failed'])->count(),
            'issues' => $countRider('Failed'),
            'riders' => $riders,
            'earnings' => [
                // The delivery dashboard's own rule
                'perOrder' => self::EARNING_PER_ORDER,
                'deliveredOrders' => $delivered,
                'total' => $delivered * self::EARNING_PER_ORDER,
            ],
        ];
    }

    // Customer counts and the top spenders
    private function customerSummary(Collection $orders, CarbonImmutable $from): array
    {
        // Unique customers who ordered in the period
        $customerIds = $orders->pluck('user_id')->filter()->unique();

        // No customers: return zeros
        if ($customerIds->isEmpty()) {
            return [
                'ordered' => 0,
                'new' => 0,
                'returning' => 0,
                'totalOrders' => $orders->count(),
                'averageOrdersPerCustomer' => 0.0,
                'topCustomers' => [],
            ];
        }

        // Anyone with a non-cancelled order before the period started
        $returningIds = Order::placed()
            ->whereIn('user_id', $customerIds)
            ->where('created_at', '<', $from)
            ->distinct()
            ->pluck('user_id');

        // Customer names for the top list
        $names = User::whereIn('id', $customerIds)->pluck('name', 'id');

        // Top customers by amount spent
        $topCustomers = $orders
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->map(fn (Collection $group, $userId) => [
                'name' => $names[$userId] ?? 'Customer',
                'orders' => $group->count(),
                'amount' => (int) $group->sum('total_amount'),
            ])
            ->sortByDesc('amount')
            ->take(self::TOP_CUSTOMER_LIMIT)
            ->values()
            ->all();

        return [
            'ordered' => $customerIds->count(),
            'new' => $customerIds->count() - $returningIds->count(),
            'returning' => $returningIds->count(),
            'totalOrders' => $orders->count(),
            'averageOrdersPerCustomer' => round($orders->count() / max(1, $customerIds->count()), 2),
            'topCustomers' => $topCustomers,
        ];
    }

    // Stock as it stands right now
    private function inventorySummary(): array
    {
        // All products with their stock
        $products = Product::get(['id', 'name', 'category', 'unit', 'stock', 'status']);

        // Products below the low-stock line
        $lowStock = $products
            ->filter(fn ($p) => $p->stock > 0 && $p->stock < self::LOW_STOCK_THRESHOLD)
            ->sortBy('stock')
            ->values()
            ->map(fn ($p) => [
                'name' => $p->name,
                'category' => $p->category,
                'unit' => $p->unit,
                'stock' => (int) $p->stock,
                'status' => 'Low Stock',
            ])
            ->all();

        // Products with no stock
        $outOfStock = $products
            ->filter(fn ($p) => $p->stock <= 0)
            ->values()
            ->map(fn ($p) => [
                'name' => $p->name,
                'category' => $p->category,
                'unit' => $p->unit,
                'stock' => 0,
                'status' => 'Out of Stock',
            ])
            ->all();

        return [
            'totalProducts' => $products->count(),
            'inStock' => $products->filter(fn ($p) => $p->stock >= self::LOW_STOCK_THRESHOLD)->count(),
            'lowStock' => count($lowStock),
            'outOfStock' => count($outOfStock),
            'lowStockProducts' => $lowStock,
            'outOfStockProducts' => $outOfStock,
        ];
    }

    // One row per calendar day in the range
    private function dailySales(Collection $orders, Collection $refunds, CarbonImmutable $from, CarbonImmutable $to): array
    {
        // Orders and refunds grouped by day
        $ordersByDay = $orders->groupBy(fn (Order $o) => $o->created_at->toDateString());
        $refundsByDay = $refunds->groupBy(fn (Refund $r) => $r->completed_at->toDateString());

        $days = [];
        // Walk through each day in the range
        for ($cursor = $from; $cursor->lte($to); $cursor = $cursor->addDay()) {
            $key = $cursor->toDateString();
            $dayOrders = $ordersByDay->get($key, collect());
            $dayRefunds = $refundsByDay->get($key, collect());

            // Same rule as the period totals
            $day = $this->sales($dayOrders, $dayRefunds);

            $days[] = [
                'date' => $key,
                'orders' => $dayOrders->count(),
                'grossSales' => $day['grossProductSales'],
                'discount' => $day['totalDiscount'],
                'deliveryFee' => $day['deliveryFee'],
                'refund' => $day['totalRefund'],
                'netSales' => $day['netSales'],
            ];
        }

        return $days;
    }

    // Rates and averages, each guarded against an empty period.
    private function kpis(Collection $orders, Collection $refunds): array
    {
        // Order counts used by the rates
        $total = $orders->count();
        $delivered = $orders->where('status', 'Delivered')->count();
        $cancelled = $orders->where('status', 'Cancelled')->count();
        $returned = $orders->where('status', 'Returned')->count();
        $sold = $total - $cancelled; // the orders net sales was built from
        $netSales = $this->sales($orders, $refunds)['netSales'];

        // Percentage helper that is safe with zero
        $rate = fn (int $part, int $whole) => $whole > 0 ? round(($part / $whole) * 100, 1) : 0.0;

        return [
            'completionRate' => $rate($delivered, $total),
            'cancellationRate' => $rate($cancelled, $total),
            'returnRate' => $rate($returned, $delivered),
            // Averaged over the orders net sales was built from
            'averageOrderValue' => $sold > 0 ? (int) round($netSales / $sold) : 0,
            'deliveredOrders' => $delivered,
        ];
    }
}
