<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: add workflow fields to complaints table
return new class extends Migration
{
    // Apply this change to the database
    public function up(): void
    {
        DB::statement("ALTER TABLE complaints MODIFY status ENUM('Pending', 'In Review', 'Under Review', 'Waiting for Response', 'Resolved', 'Rejected', 'Closed') NOT NULL DEFAULT 'Pending'");

        DB::statement("UPDATE complaints SET status = 'Under Review' WHERE status = 'In Review'");

        DB::statement("ALTER TABLE complaints MODIFY status ENUM('Pending', 'Under Review', 'Waiting for Response', 'Resolved', 'Rejected', 'Closed') NOT NULL DEFAULT 'Pending'");

        Schema::table('complaints', function (Blueprint $table) {
            $table->enum('waiting_on', ['customer', 'delivery'])->nullable()->after('status');
            $table->text('resolution_note')->nullable()->after('reason');
            $table->timestamp('decided_at')->nullable()->after('waiting_on');
            $table->timestamp('closed_at')->nullable()->after('decided_at');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn(['waiting_on', 'resolution_note', 'decided_at', 'closed_at']);
        });

        DB::statement("UPDATE complaints SET status = 'In Review' WHERE status = 'Under Review'");
        DB::statement("UPDATE complaints SET status = 'Pending' WHERE status IN ('Waiting for Response', 'Rejected', 'Closed')");

        DB::statement("ALTER TABLE complaints MODIFY status ENUM('Pending', 'In Review', 'Resolved') NOT NULL DEFAULT 'Pending'");
    }
};
