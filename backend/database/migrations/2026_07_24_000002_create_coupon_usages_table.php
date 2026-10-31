<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create coupon usages table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::create('coupon_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->unsignedInteger('discount_amount')->default(0);
            $table->boolean('free_delivery')->default(false);
            $table->timestamps();

            $table->index(['coupon_id', 'customer_id']);
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('coupon_usages');
    }
};
