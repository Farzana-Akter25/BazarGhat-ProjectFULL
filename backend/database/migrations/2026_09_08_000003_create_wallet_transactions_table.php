<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create wallet transactions table
return new class extends Migration
{
    // Append-only ledger behind users.wallet_balance.
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['CREDIT', 'DEBIT']);
            $table->unsignedInteger('amount');
            $table->unsignedInteger('balance_after')->default(0);
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique(
                ['customer_id', 'type', 'reference_type', 'reference_id'],
                'wallet_tx_unique_reference'
            );
            $table->index(['customer_id', 'created_at']);
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
