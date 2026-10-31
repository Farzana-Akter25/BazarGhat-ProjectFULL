<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add payment channel to orders
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_channel')->nullable()->after('payment_method');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('payment_channel');
        });
    }
};
