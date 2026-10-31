<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: add inactive status to users table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY status ENUM('Active', 'Blocked', 'Inactive') NOT NULL DEFAULT 'Active'");
    }

    // Reverse the migrations.
    public function down(): void
    {
        DB::statement("UPDATE users SET status = 'Active' WHERE status = 'Inactive'");
        DB::statement("ALTER TABLE users MODIFY status ENUM('Active', 'Blocked') NOT NULL DEFAULT 'Active'");
    }
};
