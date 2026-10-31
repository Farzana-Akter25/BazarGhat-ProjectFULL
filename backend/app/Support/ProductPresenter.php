<?php

namespace App\Support;

use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// The one customer-facing shape for a product.
class ProductPresenter
{
    // Base product fields merged with price details and any extra fields
    public static function present(Product $product, array $pricing, array $extra = []): array
    {
        return array_merge([
            'id' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'img' => self::imageUrl($product->image, $product->name),
            'weight' => $product->unit,
            'category' => $product->category,
            'stock' => (int) $product->stock,
            'inStock' => $product->stock > 0 && $product->status === 'Active',
        ], $pricing, $extra);
    }

    // Full image URL, or a placeholder image when there is none
    public static function imageUrl(?string $image, string $name): string
    {
        if (! $image) {
            return 'https://placehold.co/300x300/eff0f5/64748b?text=' . urlencode($name);
        }

        if (Str::startsWith($image, ['http://', 'https://'])) {
            return $image;
        }

        return Storage::disk('public')->url($image);
    }
}
