<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: extend coupons table for promotion rules
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->enum('audience', ['all', 'selected'])->default('selected')->after('coupon_type');
            $table->string('campaign_name')->nullable()->after('coupon_code');
            $table->date('start_date')->nullable()->after('minimum_order');
            $table->unsignedInteger('usage_limit')->nullable()->after('start_date');
            $table->unsignedInteger('per_user_limit')->nullable()->default(1)->after('usage_limit');
            $table->unsignedInteger('max_discount')->nullable()->after('per_user_limit');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn(['audience', 'campaign_name', 'start_date', 'usage_limit', 'per_user_limit', 'max_discount']);
        });
    }
};
