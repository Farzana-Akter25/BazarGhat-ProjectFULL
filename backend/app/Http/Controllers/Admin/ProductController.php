<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

// Admin endpoints for creating, editing and deleting products
class ProductController extends Controller
{
    // List all products, newest first
    public function index()
    {
        $products = Product::orderByDesc('id')->get();

        return response()->json([
            'products' => $products->map(fn (Product $product) => $this->present($product)),
        ]);
    }

    // Create a new product
    public function store(Request $request)
    {
        // Validation rules for a new product
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string|max:100',
            'unit' => 'required|string|max:50',
            'price' => 'required|integer|min:0',
            'original_price' => 'nullable|integer|min:0',
            'discount' => 'nullable|integer|min:0|max:100',
            'stock' => 'required|integer|min:1',
            'image' => 'nullable|string',
            'image_file' => 'nullable|image|max:4096',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Keep only the validated fields; the image is handled separately below
        $data = $validator->validated();
        unset($data['image'], $data['image_file']);

        // Use the uploaded image file, or else the image URL that was sent
        if ($request->hasFile('image_file')) {
            $data['image'] = $request->file('image_file')->store('products', 'public');
        } elseif ($request->filled('image')) {
            $data['image'] = $request->input('image');
        }

        // Save the product
        $product = Product::create($data);

        return response()->json(['product' => $this->present($product)], 201);
    }

    // Update an existing product; only the fields sent are changed
    public function update(Request $request, Product $product)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'sometimes|required|string|max:100',
            'unit' => 'sometimes|required|string|max:50',
            'price' => 'sometimes|required|integer|min:0',
            'original_price' => 'nullable|integer|min:0',
            'discount' => 'nullable|integer|min:0|max:100',
            'stock' => 'sometimes|required|integer|min:1',
            'image' => 'nullable|string',
            'image_file' => 'nullable|image|max:4096',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        unset($data['image'], $data['image_file']);

        // On a new upload, delete the old stored image first (not external URLs)
        if ($request->hasFile('image_file')) {
            if ($product->image && ! str_starts_with($product->image, 'http')) {
                Storage::disk('public')->delete($product->image);
            }
            $data['image'] = $request->file('image_file')->store('products', 'public');
        } elseif ($request->filled('image')) {
            $data['image'] = $request->input('image');
        }

        // Save the changes
        $product->update($data);

        return response()->json(['product' => $this->present($product)]);
    }

    // Delete a product
    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }

    // Shape a product into the array the admin page uses
    private function present(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'unit' => $product->unit,
            'category' => $product->category,
            'price' => $product->price,
            'original' => $product->original_price,
            'discount' => $product->discount,
            'stock' => $product->stock,
            'image' => $this->imageUrl($product->image),
            'status' => $product->statusLabel(),
            'created_at' => $product->created_at?->format('d M Y, h:i A'),
        ];
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
