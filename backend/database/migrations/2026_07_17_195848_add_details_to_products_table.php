<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add details to products table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('name')->after('id');
            $table->text('description')->nullable()->after('name');
            $table->string('category')->default('Grocery')->after('description');
            $table->string('unit')->default('1kg')->after('category');
            $table->unsignedInteger('price')->default(0)->after('unit');
            $table->unsignedInteger('original_price')->nullable()->after('price');
            $table->unsignedTinyInteger('discount')->default(0)->after('original_price');
            $table->unsignedInteger('stock')->default(0)->after('discount');
            $table->string('image')->nullable()->after('stock');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'name', 'description', 'category', 'unit', 'price',
                'original_price', 'discount', 'stock', 'image',
            ]);
        });
    }
};
