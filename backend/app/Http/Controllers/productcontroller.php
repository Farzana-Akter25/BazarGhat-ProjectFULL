<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;

class ProductController extends Controller
{
    public function createProduct(Request $request)
    {
        $product = new Product();
         $product->name = $request->name;
         $product->price = $request->price;
         $product->description = $request->description;
         $product->save();
         return response()->json([$product]);
    }
}
