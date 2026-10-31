<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: extend returns status and admin note
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE returns MODIFY status ENUM('Pending', 'In Review', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending'");

        Schema::table('returns', function (Blueprint $table) {
            $table->text('admin_note')->nullable()->after('note');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->dropColumn('admin_note');
        });

        DB::statement("ALTER TABLE returns MODIFY status ENUM('Pending', 'In Review', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending'");
    }
};
