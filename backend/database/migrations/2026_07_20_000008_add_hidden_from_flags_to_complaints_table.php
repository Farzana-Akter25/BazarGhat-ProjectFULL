<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add hidden from flags to complaints table
return new class extends Migration
{
    // Apply this change to the database
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->timestamp('hidden_from_customer_at')->nullable()->after('closed_at');
            $table->timestamp('hidden_from_delivery_at')->nullable()->after('hidden_from_customer_at');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn(['hidden_from_customer_at', 'hidden_from_delivery_at']);
        });
    }
};
