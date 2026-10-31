<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add manual fallback to refunds table
return new class extends Migration
{
    // Marks a refund that had to come back as BazarGhat balance because the route it should have taken was not usable.
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->boolean('is_manual_fallback')->default(false)->after('refund_method');
            $table->string('fallback_reason')->nullable()->after('is_manual_fallback');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropColumn(['is_manual_fallback', 'fallback_reason']);
        });
    }
};
