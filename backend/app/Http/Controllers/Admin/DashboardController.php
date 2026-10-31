<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// The cards, chart and latest-order list on the admin home screen.
class DashboardController extends Controller
{
    // GET /admin/dashboard/summary — the top cards and the sales chart
    public function summary(Request $request)
    {
        // how many days back the screen is asking for, 7 unless it says otherwise
        $days = (int) $request->query('range', 7);
        // Start of the first day in the range
        $from = Carbon::now()->subDays($days - 1)->startOfDay();

        // Order::placed() is the same set the business report is built from
        $orders = Order::placed()->where('created_at', '>=', $from)->get();
        // A cancelled order brings in no money
        $earning = $orders->where('status', '!=', 'Cancelled');

        // one bar per day, oldest first, so empty days still appear on the chart
        $chart = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $dayOrders = $orders->filter(fn ($o) => $o->created_at->isSameDay($day));
            $chart[] = [
                // weekday plus date on a short range
                'label' => $days <= 7 ? $day->format('D j') : $day->format('d M'),
                // full date and order count feed the chart's hover tooltip
                'date' => $day->format('d M Y'),
                'orders' => $dayOrders->count(),
                'value' => (int) $dayOrders->where('status', '!=', 'Cancelled')->sum('total_amount'),
            ];
        }

        // Send the cards, the status counts, the chart and the latest orders
        return response()->json([
            'revenue' => (int) $earning->sum('total_amount') . ' BDT',
            // the order count keeps cancelled ones, only the money drops them
            'orders' => $orders->count(),
            'pending' => $orders->where('status', 'Pending')->count(),
            // one customer who ordered five times still counts once
            'customers' => $orders->pluck('user_id')->filter()->unique()->count(),
            'orderStatus' => [
                'pending' => $orders->where('status', 'Pending')->count(),
                'onTheWay' => $orders->whereIn('status', ['Picked Up', 'Out for Delivery'])->count(),
                'completed' => $orders->where('status', 'Delivered')->count(),
            ],
            'chart' => $chart,
            // the five newest orders, whatever period the cards are showing
            'latestOrders' => Order::orderByDesc('id')->take(5)->get()->map(fn (Order $order) => [
                'id' => $order->order_number,
                'customer' => $order->customer_name,
                'date' => $order->created_at->format('M j, Y'),
                'amount' => $order->total_amount . ' BDT',
                'status' => $order->status === 'Delivered' ? 'Completed' : $order->status,
            ]),
        ]);
    }

    // GET /admin/dashboard/analytics — lifetime stats, trends and the monthly chart
    public function analytics()
    {
        // Current time, used as the reference point for every window
        $now = Carbon::now();
        // two windows of the same length, so one can be compared against the other
        $last30 = Order::placed()->where('created_at', '>=', $now->copy()->subDays(30))->get();
        $prev30 = Order::placed()->whereBetween('created_at', [$now->copy()->subDays(60), $now->copy()->subDays(30)])->get();
        // Revenue counts only what a cancelled order isn't
        $earned = fn ($orders) => (int) $orders->where('status', '!=', 'Cancelled')->sum('total_amount');

        // Lifetime figures shown on the stat cards
        $totalRevenue = (int) $this->earningOrders()->sum('total_amount');
        $totalOrders = Order::placed()->count();
        // Items on cancelled orders went back on the shelf
        $productsSold = (int) OrderItem::whereIn('order_id', $this->earningOrders()->select('id'))->sum('quantity');
        // Customers who signed up in the last 30 days
        $newCustomers = User::where('role', 'customer')->where('created_at', '>=', $now->copy()->subDays(30))->count();

        // the up/down arrows on the cards: this month against the one before it
        $revenueTrend = $this->percentTrend($earned($last30), $earned($prev30));
        $ordersTrend = $this->percentTrend($last30->count(), $prev30->count());

        // the last four months, oldest first, for the monthly revenue chart
        $months = collect(range(3, 0))->map(function ($i) use ($now, $earned) {
            $month = $now->copy()->subMonths($i);
            $monthOrders = Order::placed()->whereYear('created_at', $month->year)->whereMonth('created_at', $month->month)->get();

            return [
                'month' => $month->format('M'),
                'revenue' => $earned($monthOrders),
                'orders' => $monthOrders->count(),
            ];
        });
        // bars are drawn against the best month, and max(1, …) keeps an empty period off a divide by zero
        $maxRevenue = max(1, $months->max('revenue'));
        // Add each month's bar height as a percentage of the best month
        $monthlyRevenue = $months->map(fn ($m) => [
            ...$m,
            'pct' => (int) round(($m['revenue'] / $maxRevenue) * 100),
        ]);

        // sales per product category, biggest earner first
        $categoryTotals = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
            ->whereIn('order_items.order_id', $this->earningOrders()->select('id'))
            ->select('products.category', DB::raw('SUM(order_items.line_total) as revenue'))
            ->groupBy('products.category')
            ->orderByDesc('revenue')
            ->get();
        // each category's share is measured against all of them together
        $totalCategoryRevenue = max(1, $categoryTotals->sum('revenue'));
        $topCategories = $categoryTotals->take(5)->values()->map(fn ($c, $i) => [
            'rank' => $i + 1,
            'name' => $c->category,
            'pct' => (int) round(($c->revenue / $totalCategoryRevenue) * 100),
            'revenue' => (int) $c->revenue . 'TK',
        ]);

        // the five most recent payments, for the transactions panel
        $transactions = Order::orderByDesc('id')->take(5)->get()->map(fn (Order $order) => [
            // A reference the admin can actually look the payment up by.
            'id' => $order->gateway_transaction_id ?: ($order->transaction_id ?: $order->order_number),
            'customer' => $order->customer_name,
            'date' => $order->created_at->format('Y-m-d H:i'),
            'amount' => $order->total_amount . 'TK',
        ]);

        // Send everything the analytics page needs in one response
        return response()->json([
            'stats' => [
                ['label' => 'Total Revenue', 'value' => number_format($totalRevenue) . 'TK', 'trend' => $revenueTrend['label'], 'up' => $revenueTrend['up']],
                ['label' => 'Total Orders', 'value' => number_format($totalOrders), 'trend' => $ordersTrend['label'], 'up' => $ordersTrend['up']],
                ['label' => 'Products Sold', 'value' => number_format($productsSold), 'trend' => null, 'up' => true],
                ['label' => 'New Customers', 'value' => number_format($newCustomers), 'trend' => null, 'up' => true],
            ],
            'monthlyRevenue' => $monthlyRevenue,
            'topCategories' => $topCategories,
            'transactions' => $transactions,
        ]);
    }

    // The orders any revenue figure is allowed to count
    private function earningOrders()
    {
        return Order::placed()->where('status', '!=', 'Cancelled');
    }

    // how far a figure moved against the period before it
    private function percentTrend(int|float $current, int|float $previous): array
    {
        // nothing to compare against, so no arrow is shown at all
        if ($previous <= 0) {
            return ['label' => null, 'up' => true];
        }

        // Percentage change from the previous period to the current one
        $pct = (($current - $previous) / $previous) * 100;

        return [
            'label' => ($pct >= 0 ? '+' : '') . number_format($pct, 1) . '%',
            'up' => $pct >= 0,
        ];
    }
}
