<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create orders table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->text('shipping_address')->nullable();
            $table->enum('status', ['Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled'])->default('Pending');
            $table->enum('payment_status', ['Unpaid', 'Paid'])->default('Unpaid');
            $table->string('payment_method')->nullable();
            $table->unsignedInteger('subtotal')->default(0);
            $table->unsignedInteger('discount')->default(0);
            $table->unsignedInteger('total_amount')->default(0);
            $table->timestamps();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
