<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: add photos to returns
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->json('photos')->nullable()->after('note');
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->dropColumn('photos');
        });
    }
};
