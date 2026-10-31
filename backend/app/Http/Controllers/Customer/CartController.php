<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use App\Services\FlashSalePricing;
use App\Support\ProductPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Customer shopping cart endpoints
class CartController extends Controller
{
    // Inject the flash sale pricing service
    public function __construct(private readonly FlashSalePricing $pricing)
    {
    }

    // List the customer's cart items with live prices
    public function index(Request $request)
    {
        // Load this customer's cart items, skipping products that were deleted
        $cartItems = CartItem::with('product')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->filter(fn (CartItem $item) => $item->product !== null)
            ->values();

        // Cart lines are priced live on every read
        $pricing = $this->pricing->breakdownsFor($cartItems->pluck('product'));

        return response()->json([
            'items' => $cartItems->map(fn (CartItem $item) => $this->present($item, $pricing[$item->product->id])),
        ]);
    }

    // Add a product to the cart (or increase its quantity)
    public function store(Request $request)
    {
        // Product id is required; quantity is optional
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Load the product; it must be active and in stock
        $product = Product::findOrFail($request->product_id);

        if ($product->status !== 'Active' || $product->stock <= 0) {
            return response()->json(['message' => 'This product is currently out of stock.'], 422);
        }

        $userId = $request->user()->id;
        // Default quantity is 1
        $requested = (int) $request->input('quantity', 1);

        // Find the cart line for this product, or create an empty one
        $cartItem = CartItem::firstOrCreate(
            ['user_id' => $userId, 'product_id' => $product->id],
            ['quantity' => 0]
        );

        // Add the quantity, but never more than the stock
        $cartItem->quantity = min($cartItem->quantity + $requested, $product->stock);
        $cartItem->save();

        return response()->json(['item' => $this->present($cartItem->fresh('product'))], 201);
    }

    // Change the quantity of one product in the cart
    public function update(Request $request, Product $product)
    {
        // Quantity must be at least 1
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Load this customer's cart line for the product
        $cartItem = CartItem::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->firstOrFail();

        // Keep the quantity within the available stock
        $quantity = (int) $request->quantity;
        if ($product->stock > 0) {
            $quantity = min($quantity, $product->stock);
        }

        // Save, never going below 1
        $cartItem->update(['quantity' => max(1, $quantity)]);

        return response()->json(['item' => $this->present($cartItem->fresh('product'))]);
    }

    // Remove one product from the cart
    public function destroy(Request $request, Product $product)
    {
        CartItem::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->delete();

        return response()->json(['message' => 'Item removed from cart.']);
    }

    // Empty the whole cart
    public function clear(Request $request)
    {
        CartItem::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Cart cleared.']);
    }

    // Shape a cart line using the shared product format plus its quantity
    private function present(CartItem $cartItem, ?array $pricing = null): array
    {
        $product = $cartItem->product;
        $pricing ??= $this->pricing->breakdownFor($product);

        return ProductPresenter::present($product, $pricing, [
            'quantity' => $cartItem->quantity,
        ]);
    }
}
