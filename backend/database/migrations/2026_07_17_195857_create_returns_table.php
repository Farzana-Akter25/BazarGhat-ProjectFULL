<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create returns table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::create('returns', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained('order_items')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', ['Return', 'Refund'])->default('Return');
            $table->string('product_name');
            $table->string('variant')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('price')->default(0);
            $table->string('reason');
            $table->text('note')->nullable();
            $table->unsignedInteger('amount')->default(0);
            $table->string('payment_method')->nullable();
            $table->unsignedInteger('shipping_fee')->default(0);
            $table->enum('status', ['Pending', 'In Review', 'Approved', 'Rejected'])->default('Pending');
            $table->timestamps();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('returns');
    }
};
