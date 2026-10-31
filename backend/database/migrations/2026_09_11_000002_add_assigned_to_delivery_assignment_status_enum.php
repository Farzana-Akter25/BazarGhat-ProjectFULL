<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: add assigned to delivery assignment status enum
return new class extends Migration
{
    // A fresh assignment has read "Assigned" since the rider statuses were extended (see the 2026_07_20 migration).
    public function up(): void
    {
        DB::statement("ALTER TABLE delivery_assignments MODIFY status ENUM(
            'Assigned', 'Pending', 'In Progress', 'Completed'
        ) NOT NULL DEFAULT 'Assigned'");
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        // 'Pending' was the old wording for a just-handed-over assignment, so rows still on 'Assigned' fold back into it rather than being truncated away.
        DB::statement("UPDATE delivery_assignments SET status = 'Pending' WHERE status = 'Assigned'");

        DB::statement("ALTER TABLE delivery_assignments MODIFY status ENUM(
            'Pending', 'In Progress', 'Completed'
        ) NOT NULL DEFAULT 'Pending'");
    }
};
