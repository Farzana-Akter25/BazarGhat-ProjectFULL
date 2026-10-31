<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: extend returns for replacement refund lifecycle
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->enum('source', ['Customer Request', 'System Cancellation'])
                ->default('Customer Request')->after('type');
            $table->enum('resolution', ['Replacement', 'Refund'])->nullable()->after('status');
            $table->foreignId('replacement_order_id')->nullable()->after('resolution')
                ->constrained('orders')->nullOnDelete();
            $table->enum('refund_status', ['Not Applicable', 'Initiated', 'Processing', 'Completed'])
                ->default('Not Applicable')->after('replacement_order_id');
            $table->timestamp('refund_initiated_at')->nullable()->after('refund_status');
            $table->timestamp('refund_processing_at')->nullable()->after('refund_initiated_at');
            $table->timestamp('refund_completed_at')->nullable()->after('refund_processing_at');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('replacement_order_id');
            $table->dropColumn([
                'source', 'resolution', 'refund_status',
                'refund_initiated_at', 'refund_processing_at', 'refund_completed_at',
            ]);
        });
    }
};
