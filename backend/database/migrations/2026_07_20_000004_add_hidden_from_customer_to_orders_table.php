<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add hidden from customer to orders table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('hidden_from_customer_at')->nullable()->after('replacement_for_order_id');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('hidden_from_customer_at');
        });
    }
};
