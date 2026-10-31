<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: add refund method to returns table
return new class extends Migration
{
    // A post-delivery refund needs a destination, and two people have a say in it.
    public function up(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->enum('preferred_refund_method', ['WALLET', 'ORIGINAL_PAYMENT'])
                ->nullable()->after('resolution');
            $table->enum('refund_method', ['WALLET', 'ORIGINAL_PAYMENT'])
                ->nullable()->after('preferred_refund_method');
        });

        DB::statement("ALTER TABLE returns MODIFY refund_status ENUM('Not Applicable', 'Pending Approval', 'Initiated', 'Processing', 'Completed', 'Refunded', 'Failed', 'Rejected') NOT NULL DEFAULT 'Not Applicable'");
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        DB::statement("UPDATE returns SET refund_status = 'Not Applicable' WHERE refund_status IN ('Pending Approval', 'Rejected')");
        DB::statement("ALTER TABLE returns MODIFY refund_status ENUM('Not Applicable', 'Initiated', 'Processing', 'Completed', 'Refunded', 'Failed') NOT NULL DEFAULT 'Not Applicable'");

        Schema::table('returns', function (Blueprint $table) {
            $table->dropColumn(['preferred_refund_method', 'refund_method']);
        });
    }
};
