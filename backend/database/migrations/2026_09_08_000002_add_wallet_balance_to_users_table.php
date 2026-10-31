<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add wallet balance to users table
return new class extends Migration
{
    // Cached balance so a customer's refund balance can be read without summing the whole ledger.
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('wallet_balance')->default(0)->after('status');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('wallet_balance');
        });
    }
};
