<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add phone verified at and unique phone to users table
return new class extends Migration
{
    // Apply this change to the database
    public function up(): void
    {
        // No DB-level unique index on phone: existing data already has duplicate phone numbers, so uniqueness for new registrations is enforced in AuthController@register instead.
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('phone_verified_at')->nullable()->after('phone');
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone_verified_at');
        });
    }
};
