<?php

namespace App\Services;

use App\Models\FlashSale;
use App\Models\FlashSaleProduct;
use App\Models\Product;
use Illuminate\Contracts\Database\Query\Builder as BuilderContract;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// The single source of truth for what a product actually sells for right now.
class FlashSalePricing
{
    // Alias of the joined-in "cheapest live sale price per product" derived table
    public const JOIN_ALIAS = 'active_flash_sale';

    // The effective-price rule expressed in SQL
    public const EFFECTIVE_PRICE_SQL = 'LEAST(COALESCE(' . self::JOIN_ALIAS . '.sale_price, products.price), products.price)';

    // Left-join the cheapest currently-live sale price for each product
    public function joinActiveSales(BuilderContract $query, ?Carbon $at = null): BuilderContract
    {
        // Default to the current time
        $at = $at ?: now();

        // Lowest live sale price for each product
        $liveSalePrices = DB::table('flash_sale_products')
            ->join('flash_sales', 'flash_sales.id', '=', 'flash_sale_products.flash_sale_id')
            ->where('flash_sales.status', FlashSale::STATUS_ACTIVE)
            ->where('flash_sales.start_at', '<=', $at)
            ->where('flash_sales.end_at', '>=', $at)
            ->groupBy('flash_sale_products.product_id')
            ->select('flash_sale_products.product_id')
            ->selectRaw('MIN(flash_sale_products.sale_price) as sale_price');

        // Join it onto the products query
        return $query->leftJoinSub(
            $liveSalePrices,
            self::JOIN_ALIAS,
            self::JOIN_ALIAS . '.product_id',
            '=',
            'products.id',
        );
    }

    // The sale row that is live right now for each of the given products
    public function activeSalesFor(iterable $productIds, ?Carbon $at = null): Collection
    {
        // Clean list of unique product ids
        $ids = collect($productIds)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        $at = $at ?: now();

        // Load live sale rows and keep the cheapest (then soonest-ending) one per product
        return FlashSaleProduct::query()
            ->whereIn('product_id', $ids)
            ->whereHas('flashSale', fn ($query) => $query->active($at))
            ->with('flashSale')
            ->get()
            ->groupBy('product_id')
            ->map(fn (Collection $rows) => $rows
                ->sortBy(fn (FlashSaleProduct $row) => [
                    $row->sale_price,
                    $row->flashSale->end_at->getTimestamp(),
                ])
                ->first());
    }

    // Price breakdown for one product
    public function breakdown(Product $product, ?FlashSaleProduct $sale = null): array
    {
        // The product's normal selling price
        $normalPrice = (int) $product->price;
        
        // Use original_price 
        if ($product->original_price) {
            $regularPrice = (int) $product->original_price;
        } elseif ((int) $product->discount > 0) {
            $regularPrice = $normalPrice + (int) $product->discount;
        } else {
            $regularPrice = null;
        }

        // A sale may only ever move a price down.
        $salePrice = $sale ? min((int) $sale->sale_price, $normalPrice) : null;
        $onFlashSale = $salePrice !== null && $salePrice < $normalPrice;

        // Price the customer pays now
        $effectivePrice = $onFlashSale ? $salePrice : $normalPrice;

        // While a sale runs it is the normal selling price that gets struck through
        $oldPrice = $onFlashSale
            ? $normalPrice
            : ($regularPrice && $regularPrice > $normalPrice ? $regularPrice : null);

        // Everything the frontend needs to show the price
        return [
            'price' => $effectivePrice,
            'oldPrice' => $oldPrice,
            'normal_price' => $normalPrice,
            'regular_price' => $regularPrice,
            // Discount % between the struck-through price and the price now
            'discount_percentage' => $oldPrice > 0
                ? (int) round((($oldPrice - $effectivePrice) / $oldPrice) * 100)
                : 0,
            'on_flash_sale' => $onFlashSale,
            'flash_sale' => $onFlashSale ? $this->saleMeta($sale->flashSale) : null,
        ];
    }

    // Breakdowns for a set of products in one round trip, keyed by product id.
    public function breakdownsFor($products, ?Carbon $at = null): Collection
    {
        // Load live sales for all the products at once
        $products = collect($products);
        $activeSales = $this->activeSalesFor($products->pluck('id'), $at);

        return $products->mapWithKeys(fn (Product $product) => [
            $product->id => $this->breakdown($product, $activeSales->get($product->id)),
        ]);
    }

    // Breakdown for a single product, resolving its live sale on the spot.
    public function breakdownFor(Product $product, ?Carbon $at = null): array
    {
        return $this->breakdown($product, $this->activeSalesFor([$product->id], $at)->get($product->id));
    }

    // What the customer is charged for one unit right now
    public function effectivePriceFor(Product $product, ?FlashSaleProduct $sale = null): int
    {
        return $this->breakdown($product, $sale)['price'];
    }

    // Countdown/labelling payload for a running sale.
    private function saleMeta(FlashSale $flashSale): array
    {
        return [
            'id' => $flashSale->id,
            'name' => $flashSale->name,
            'start_at' => $flashSale->start_at->toIso8601String(),
            'end_at' => $flashSale->end_at->toIso8601String(),
            'seconds_to_end' => max(0, $flashSale->end_at->getTimestamp() - now()->getTimestamp()),
        ];
    }
}
