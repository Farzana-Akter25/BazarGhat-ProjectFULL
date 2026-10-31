<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create refunds table
return new class extends Migration
{
    // One row per refund of money to a customer, whichever way it travels.
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('refund_number')->unique();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('amount');
            $table->enum('refund_method', ['WALLET', 'ORIGINAL_PAYMENT']);
            $table->string('payment_method')->nullable();
            $table->string('payment_gateway')->nullable();
            $table->string('original_transaction_id')->nullable();
            $table->string('gateway_transaction_id')->nullable();
            $table->string('sslcommerz_refund_id')->nullable();
            $table->enum('status', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])->default('PENDING');
            $table->string('reason')->nullable();
            $table->text('failure_reason')->nullable();
            $table->string('idempotency_key')->unique();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('requested_by_role')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'refund_method']);
            $table->index('customer_id');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
