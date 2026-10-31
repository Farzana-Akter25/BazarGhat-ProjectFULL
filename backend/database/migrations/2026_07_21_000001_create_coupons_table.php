<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create coupons table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('coupon_code')->unique();
            $table->enum('coupon_type', ['free_delivery', 'fixed_discount', 'percentage_discount'])->default('free_delivery');
            $table->enum('discount_type', ['flat', 'percentage'])->nullable();
            $table->unsignedInteger('discount_value')->nullable();
            $table->unsignedInteger('minimum_order')->nullable();
            $table->boolean('first_order_only')->default(false);
            $table->enum('generated_by', ['System', 'Admin'])->default('Admin');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->date('expiry_date')->nullable();
            $table->timestamps();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
