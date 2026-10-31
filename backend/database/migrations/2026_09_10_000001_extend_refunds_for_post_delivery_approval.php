<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: extend refunds for post delivery approval
return new class extends Migration
{
    // Refunds so far could only be raised by cancelling an order, which needs no review.
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->foreignId('return_request_id')->nullable()->after('order_id')
                ->constrained('returns')->nullOnDelete();
            $table->enum('source', ['CANCELLATION', 'POST_DELIVERY'])
                ->default('CANCELLATION')->after('refund_method');
            $table->foreignId('approved_by')->nullable()->after('requested_by_role')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->text('rejection_reason')->nullable()->after('rejected_at');

            $table->index('source');
        });

        // REJECTED joins the terminal states: an admin refusing a post-delivery refund is not the same thing as a refund that failed at the gateway.
        DB::statement("ALTER TABLE refunds MODIFY status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED') NOT NULL DEFAULT 'PENDING'");
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        DB::statement("UPDATE refunds SET status = 'FAILED' WHERE status = 'REJECTED'");
        DB::statement("ALTER TABLE refunds MODIFY status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING'");

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropConstrainedForeignId('return_request_id');
            $table->dropConstrainedForeignId('approved_by');
            $table->dropIndex(['source']);
            $table->dropColumn(['source', 'approved_at', 'rejected_at', 'rejection_reason']);
        });
    }
};
