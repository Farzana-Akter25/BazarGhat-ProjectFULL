<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add gateway payment details to orders table
return new class extends Migration
{
    // Everything the refund flow needs to know about how an order was actually settled.
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_gateway')->nullable()->after('payment_channel');
            $table->string('transaction_id')->nullable()->after('payment_gateway');
            $table->string('gateway_transaction_id')->nullable()->after('transaction_id');
            $table->string('gateway_val_id')->nullable()->after('gateway_transaction_id');
            $table->unsignedInteger('paid_amount')->default(0)->after('gateway_val_id');
            $table->timestamp('paid_at')->nullable()->after('paid_amount');
            $table->unsignedInteger('wallet_amount')->default(0)->after('discount');

            $table->index('gateway_transaction_id');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['gateway_transaction_id']);
            $table->dropColumn([
                'payment_gateway', 'transaction_id', 'gateway_transaction_id',
                'gateway_val_id', 'paid_amount', 'paid_at', 'wallet_amount',
            ]);
        });
    }
};
