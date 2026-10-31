<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockTransaction;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

// Admin endpoints for stock levels and stock history
class InventoryController extends Controller
{
    // List every product with its stock, damaged stock and units sold
    public function index()
    {
        $products = Product::withSum('orderItems as sold', 'quantity')->orderByDesc('id')->get();

        return response()->json([
            'items' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'price' => $product->price,
                'category' => $product->category,
                'unit' => $product->unit,
                'description' => $product->description,
                'image' => $this->imageUrl($product->image),
                'sold' => (int) ($product->sold ?? 0),
                'stock' => $product->stock,
                'damagedStock' => $product->damaged_stock,
                'status' => $product->statusLabel() === 'Active' ? 'In Stock' : $product->statusLabel(),
                'created_at' => $product->created_at?->format('d M Y, h:i A'),
            ]),
        ]);
    }

    // Recent stock transactions
    public function transactions()
    {
        $transactions = StockTransaction::with(['product', 'order', 'createdBy'])
            ->orderByDesc('id')
            ->take(200)
            ->get();

        return response()->json([
            'transactions' => $transactions->map(fn (StockTransaction $t) => [
                'id' => $t->id,
                'productId' => $t->product_id,
                'productName' => $t->product?->name,
                'orderNumber' => $t->order?->order_number,
                'type' => $t->transaction_type,
                'quantity' => $t->quantity,
                'previousStock' => $t->previous_stock,
                'newStock' => $t->new_stock,
                'reason' => $t->reason,
                'createdBy' => $t->createdBy?->name,
                'createdAt' => $t->created_at->format('d M Y, h:i A'),
            ]),
        ]);
    }

    // Set a product's stock to a new number and log the change
    public function update(Request $request, Product $product)
    {
        // Stock must be a whole number, zero or more
        $validator = Validator::make($request->all(), [
            'stock' => 'required|integer|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Lock the product row, update stock and record the change together
        DB::transaction(function () use ($request, $product) {
            $locked = Product::where('id', $product->id)->lockForUpdate()->first();
            $previousStock = $locked->stock;
            $locked->update(['stock' => $request->stock]);

            // Log a stock transaction only if the number actually changed
            if ($previousStock !== (int) $request->stock) {
                StockTransaction::create([
                    'product_id' => $locked->id,
                    'transaction_type' => StockTransaction::TYPE_MANUAL_ADJUSTMENT,
                    'quantity' => abs($request->stock - $previousStock),
                    'previous_stock' => $previousStock,
                    'new_stock' => $request->stock,
                    'reason' => $request->input('reason', 'Manual inventory adjustment'),
                    'created_by' => $request->user()?->id,
                ]);
            }
        });

        // Reload the product with the new stock
        $product->refresh();

        // Re-check after an adjustment
        app(NotificationService::class)->checkStockLevel($product);

        // Send back the updated product row
        return response()->json([
            'item' => [
                'id' => $product->id,
                'name' => $product->name,
                'price' => $product->price,
                'category' => $product->category,
                'unit' => $product->unit,
                'description' => $product->description,
                'image' => $this->imageUrl($product->image),
                'sold' => (int) $product->orderItems()->sum('quantity'),
                'stock' => $product->stock,
                'damagedStock' => $product->damaged_stock,
                'status' => $product->statusLabel() === 'Active' ? 'In Stock' : $product->statusLabel(),
                'created_at' => $product->created_at?->format('d M Y, h:i A'),
            ],
        ]);
    }

    // Turn a stored image path into a full public URL
    private function imageUrl(?string $image): ?string
    {
        if (! $image) {
            return null;
        }

        if (Str::startsWith($image, ['http://', 'https://'])) {
            return $image;
        }

        return Storage::disk('public')->url($image);
    }
}
