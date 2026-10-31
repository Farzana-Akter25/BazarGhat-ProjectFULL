<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: extend orders for lifecycle flow
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY status ENUM(
            'Pending', 'Processing', 'Confirmed', 'Assigned', 'Picked Up', 'Out for Delivery',
            'Delivered', 'Cancelled', 'Customer Rejected at Doorstep'
        ) NOT NULL DEFAULT 'Pending'");

        Schema::table('orders', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('cancelled_by');
            $table->boolean('is_replacement')->default(false)->after('rejection_reason');
            $table->foreignId('replacement_for_order_id')->nullable()->after('is_replacement')
                ->constrained('orders')->nullOnDelete();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('replacement_for_order_id');
            $table->dropColumn(['rejection_reason', 'is_replacement']);
        });

        DB::statement("ALTER TABLE orders MODIFY status ENUM('Pending', 'Confirmed', 'Assigned', 'Processing', 'In Transit', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending'");
    }
};
