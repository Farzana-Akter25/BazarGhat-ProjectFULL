<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Migration: widen delivery issue report photo column
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        // TEXT (64KB) was too small for a base64-encoded photo upload, causing every issue report submission with a photo to fail with "Data too long for column 'photo'".
        DB::statement('ALTER TABLE delivery_issue_reports MODIFY photo LONGTEXT NULL');
    }

    // Reverse the migrations.
    public function down(): void
    {
        DB::statement('ALTER TABLE delivery_issue_reports MODIFY photo TEXT NULL');
    }
};
