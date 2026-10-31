<?php

namespace App\Http\Controllers;

use App\Models\FlashSale;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\FlashSalePricing;
use App\Support\ProductPresenter;

// Public endpoints for flash sales shown in the shop
class FlashSaleController extends Controller
{
    // Inject the flash sale pricing service
    public function __construct(private readonly FlashSalePricing $pricing)
    {
    }

    // Running and upcoming sales — what the flash sale page renders.
    public function index()
    {
        // Load running and upcoming sales with their products, soonest first
        $flashSales = FlashSale::upcomingOrActive()
            ->with('products')
            ->orderBy('start_at')
            ->get();

        return response()->json([
            'flash_sales' => $flashSales->map(fn (FlashSale $fs) => $this->present($fs)),
        ]);
    }

    // Only the sales running right now, ending soonest first
    public function active()
    {
        $flashSales = FlashSale::active()
            ->with('products')
            ->orderBy('end_at')
            ->get();

        return response()->json([
            'flash_sales' => $flashSales->map(fn (FlashSale $fs) => $this->present($fs)),
        ]);
    }

    // Shape a flash sale and its products for the shop
    private function present(FlashSale $flashSale): array
    {
        // Current time and the sale's products
        $now = now();
        $products = $flashSale->products;

        // How many of each product have been ordered since the sale started
        $soldCounts = $products->isEmpty()
            ? collect()
            : OrderItem::whereIn('product_id', $products->pluck('id'))
                ->whereHas('order', fn ($q) => $q->where('created_at', '>=', $flashSale->start_at))
                ->selectRaw('product_id, SUM(quantity) as total')
                ->groupBy('product_id')
                ->pluck('total', 'product_id');

        // Products are priced through the shared resolver rather than
        $pricing = $this->pricing->breakdownsFor($products);

        // Sale details plus countdown values for the timer
        return [
            'id' => $flashSale->id,
            'name' => $flashSale->name,
            'discount_type' => $flashSale->discount_type,
            'discount_value' => $flashSale->discount_value,
            'start_at' => $flashSale->start_at->toIso8601String(),
            'end_at' => $flashSale->end_at->toIso8601String(),
            'phase' => $flashSale->phase(),
            'seconds_to_start' => max(0, $flashSale->start_at->getTimestamp() - $now->getTimestamp()),
            'seconds_to_end' => max(0, $flashSale->end_at->getTimestamp() - $now->getTimestamp()),
            'ends_soon' => $flashSale->isRunning() && ($flashSale->end_at->getTimestamp() - $now->getTimestamp()) <= 3600,
            'products' => $products->map(function (Product $product) use ($pricing, $soldCounts) {
                $breakdown = $pricing[$product->id];

                // What this sale will charge once it starts.
                $salePrice = min((int) $product->pivot->sale_price, (int) $product->price);

                return ProductPresenter::present($product, $breakdown, [
                    'flash_sale_price' => $salePrice,
                    'flash_sale_discount_percentage' => $product->price > 0
                        ? (int) round(((($product->price - $salePrice) / $product->price)) * 100)
                        : 0,
                    'sold_count' => (int) ($soldCounts[$product->id] ?? 0),
                ]);
            })->values(),
        ];
    }
}
