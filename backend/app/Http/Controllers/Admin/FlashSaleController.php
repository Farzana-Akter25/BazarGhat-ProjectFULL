<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use App\Models\FlashSaleProduct;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

// Admin endpoints for creating and managing flash sales
class FlashSaleController extends Controller
{
    // List flash sales with search, phase filter and pagination
    public function index(Request $request)
    {
        // Load each sale with its products and product count
        $query = FlashSale::query()->with('products')->withCount('products');

        // Search by sale name
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Phase is derived from the clock
        if ($request->filled('phase')) {
            $query->inPhase($request->query('phase'));
        }

        // Page size: default 10, capped at 100
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'flash_sales' => collect($paginator->items())->map(fn (FlashSale $fs) => $this->present($fs)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            // Whole-table counts, so the status tabs don't just describe
            'phase_counts' => $this->phaseCounts(),
        ]);
    }

    // Count how many sales are in each phase for the status tabs
    private function phaseCounts(): array
    {
        return [
            'all' => FlashSale::count(),
            FlashSale::PHASE_ACTIVE => FlashSale::query()->inPhase(FlashSale::PHASE_ACTIVE)->count(),
            FlashSale::PHASE_UPCOMING => FlashSale::query()->inPhase(FlashSale::PHASE_UPCOMING)->count(),
            FlashSale::PHASE_EXPIRED => FlashSale::query()->inPhase(FlashSale::PHASE_EXPIRED)->count(),
            FlashSale::PHASE_INACTIVE => FlashSale::query()->inPhase(FlashSale::PHASE_INACTIVE)->count(),
        ];
    }

    // Create a new flash sale with its products
    public function store(Request $request)
    {
        // Validate the form fields
        $validator = $this->validateRequest($request);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Refuse if a product is already in another active sale at the same time
        $data = $validator->validated();

        $overlapError = $this->findOverlapConflict($data['product_ids'], $data['start_at'], $data['end_at']);
        if ($overlapError) {
            return response()->json(['message' => 'Validation failed', 'errors' => ['product_ids' => [$overlapError]]], 422);
        }

        // Work out each product's sale price; refuse if a discount goes below zero
        [$priceError, $salePrices] = $this->calculateSalePrices($data['product_ids'], $data['discount_type'], $data['discount_value']);
        if ($priceError) {
            return response()->json(['message' => 'Validation failed', 'errors' => ['discount_value' => [$priceError]]], 422);
        }

        // Save the sale and its product prices in one transaction
        $flashSale = DB::transaction(function () use ($data, $salePrices) {
            $flashSale = FlashSale::create([
                'name' => $data['name'],
                'discount_type' => $data['discount_type'],
                'discount_value' => $data['discount_value'],
                'start_at' => $data['start_at'],
                'end_at' => $data['end_at'],
                'status' => $data['status'],
            ]);

            // Store the sale price for each product
            foreach ($salePrices as $productId => $salePrice) {
                FlashSaleProduct::create([
                    'flash_sale_id' => $flashSale->id,
                    'product_id' => $productId,
                    'sale_price' => $salePrice,
                ]);
            }

            return $flashSale;
        });

        return response()->json(['flash_sale' => $this->present($flashSale->fresh(['products']))], 201);
    }

    // Update an existing flash sale and replace its product list
    public function update(Request $request, FlashSale $flashSale)
    {
        $validator = $this->validateRequest($request);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // Same overlap check, ignoring this sale itself
        $overlapError = $this->findOverlapConflict($data['product_ids'], $data['start_at'], $data['end_at'], $flashSale->id);
        if ($overlapError) {
            return response()->json(['message' => 'Validation failed', 'errors' => ['product_ids' => [$overlapError]]], 422);
        }

        [$priceError, $salePrices] = $this->calculateSalePrices($data['product_ids'], $data['discount_type'], $data['discount_value']);
        if ($priceError) {
            return response()->json(['message' => 'Validation failed', 'errors' => ['discount_value' => [$priceError]]], 422);
        }

        // Save the sale and rebuild its product list in one transaction
        DB::transaction(function () use ($flashSale, $data, $salePrices) {
            $flashSale->update([
                'name' => $data['name'],
                'discount_type' => $data['discount_type'],
                'discount_value' => $data['discount_value'],
                'start_at' => $data['start_at'],
                'end_at' => $data['end_at'],
                'status' => $data['status'],
            ]);

            // Remove the old product list before adding the new one
            $flashSale->flashSaleProducts()->delete();

            foreach ($salePrices as $productId => $salePrice) {
                FlashSaleProduct::create([
                    'flash_sale_id' => $flashSale->id,
                    'product_id' => $productId,
                    'sale_price' => $salePrice,
                ]);
            }
        });

        return response()->json(['flash_sale' => $this->present($flashSale->fresh(['products']))]);
    }

    // Delete a flash sale
    public function destroy(FlashSale $flashSale)
    {
        $flashSale->delete();

        return response()->json(['message' => 'Flash sale deleted']);
    }

    // Validation rules shared by create and update
    private function validateRequest(Request $request)
    {
        return Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'discount_type' => 'required|in:percentage,fixed',
            'discount_value' => 'required|integer|min:1' . ($request->input('discount_type') === 'percentage' ? '|max:100' : ''),
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'status' => 'required|in:Active,Inactive',
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'integer|distinct|exists:products,id',
        ]);
    }

    // Return an error message if any product is in another active sale that overlaps this time range
    private function findOverlapConflict(array $productIds, string $startAt, string $endAt, ?int $excludeFlashSaleId = null): ?string
    {
        $conflicts = FlashSaleProduct::whereIn('product_id', $productIds)
            ->whereHas('flashSale', function ($q) use ($startAt, $endAt, $excludeFlashSaleId) {
                $q->where('status', 'Active')
                    ->where('start_at', '<', $endAt)
                    ->where('end_at', '>', $startAt);

                if ($excludeFlashSaleId) {
                    $q->where('id', '!=', $excludeFlashSaleId);
                }
            })
            ->with('product')
            ->get();

        if ($conflicts->isEmpty()) {
            return null;
        }

        $names = $conflicts->pluck('product.name')->filter()->unique()->values()->implode(', ');

        return "These products already belong to another active flash sale in this time range: {$names}.";
    }

    // Calculate the sale price of each product from the discount; returns [error, prices]
    private function calculateSalePrices(array $productIds, string $discountType, int $discountValue): array
    {
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
        $salePrices = [];

        foreach ($productIds as $productId) {
            $product = $products->get($productId);
            if (! $product) {
                continue;
            }

            // Percentage off, or a fixed amount off
            $salePrice = $discountType === 'percentage'
                ? (int) round($product->price - ($product->price * $discountValue / 100))
                : (int) round($product->price - $discountValue);

            if ($salePrice < 0) {
                return ["Discount exceeds the price of \"{$product->name}\".", []];
            }

            $salePrices[$productId] = $salePrice;
        }

        return [null, $salePrices];
    }

    // Shape a flash sale and its products into the array the admin page uses
    private function present(FlashSale $flashSale): array
    {
        return [
            'id' => $flashSale->id,
            'name' => $flashSale->name,
            'discount_type' => $flashSale->discount_type,
            'discount_value' => $flashSale->discount_value,
            'start_at' => $flashSale->start_at->toIso8601String(),
            'end_at' => $flashSale->end_at->toIso8601String(),
            'status' => $flashSale->status,
            'phase' => $flashSale->phase(),
            'products_count' => $flashSale->products_count ?? $flashSale->products->count(),
            'products' => $flashSale->products->map(function (Product $product) {
                $salePrice = (int) $product->pivot->sale_price;

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'image' => $product->image,
                    'category' => $product->category,
                    // The product's permanent selling price
                    'normal_price' => (int) $product->price,
                    'regular_price' => $product->original_price ? (int) $product->original_price : null,
                    'sale_price' => $salePrice,
                    'discount_percentage' => $product->price > 0
                        ? (int) round((($product->price - $salePrice) / $product->price) * 100)
                        : 0,
                    'stock' => (int) $product->stock,
                ];
            })->values(),
        ];
    }
}
