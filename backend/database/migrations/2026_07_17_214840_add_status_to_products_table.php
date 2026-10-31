<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add status to products table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->enum('status', ['Active', 'Inactive'])->default('Active')->after('stock');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
