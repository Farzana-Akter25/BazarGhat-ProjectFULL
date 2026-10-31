<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\FlashSalePricing;
use App\Support\ProductPresenter;
use Illuminate\Http\Request;

// Public shop endpoints for browsing products
class ProductController extends Controller
{
    // Orders in these states never became a real sale
    private const NON_SALE_ORDER_STATUSES = ['Cancelled', 'Customer Rejected at Doorstep'];

    // Inject the flash sale pricing service
    public function __construct(private readonly FlashSalePricing $pricing)
    {
    }

    // List active products with filters, sorting and pagination
    public function index(Request $request)
    {
        // Active products plus how many have been sold (ignoring cancelled orders)
        $query = Product::query()
            ->select('products.*')
            ->where('products.status', 'Active')
            ->withSum([
                'orderItems as ordered_quantity' => fn ($items) => $items->whereHas(
                    'order',
                    fn ($order) => $order->whereNotIn('orders.status', self::NON_SALE_ORDER_STATUSES),
                ),
            ], 'quantity');

        // Price filters and sorting run against the price customers actually see
        $this->pricing->joinActiveSales($query);
        $effectivePrice = FlashSalePricing::EFFECTIVE_PRICE_SQL;

        // Filter by category (case-insensitive)
        if ($request->filled('category')) {
            $query->whereRaw('LOWER(products.category) = ?', [strtolower($request->category)]);
        }

        // Search by product name
        if ($request->filled('search')) {
            $query->where('products.name', 'like', '%' . $request->search . '%');
        }

        // Minimum price filter
        if ($request->filled('min_price')) {
            $query->whereRaw("{$effectivePrice} >= ?", [(int) $request->min_price]);
        }

        // Maximum price filter
        if ($request->filled('max_price')) {
            $query->whereRaw("{$effectivePrice} <= ?", [(int) $request->max_price]);
        }

        // Sort by price, or by best sellers by default
        match ($request->query('sort')) {
            'price_asc' => $query->orderByRaw("{$effectivePrice} asc"),
            'price_desc' => $query->orderByRaw("{$effectivePrice} desc"),
            default => $query->orderByDesc('ordered_quantity')->orderByDesc('products.id'),
        };

        // Page size: default 12, capped at 100
        $perPage = (int) $request->query('per_page', 12);
        if ($perPage <= 0) {
            $perPage = 12;
        }
        $perPage = min($perPage, 100);

        // Run the query for this page
        $paginator = $query->paginate($perPage);

        // Work out live prices for the products on this page
        $products = collect($paginator->items());
        $pricing = $this->pricing->breakdownsFor($products);

        return response()->json([
            'products' => $products->map(
                // sold_count lets the storefront pick best sellers explicitly instead
                fn (Product $product) => ProductPresenter::present($product, $pricing[$product->id], [
                    'sold_count' => (int) $product->ordered_quantity,
                ]),
            ),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    // Show one active product; inactive ones return 404
    public function show(Product $product)
    {
        if ($product->status !== 'Active') {
            abort(404);
        }

        return response()->json([
            'product' => ProductPresenter::present($product, $this->pricing->breakdownFor($product)),
        ]);
    }
}
