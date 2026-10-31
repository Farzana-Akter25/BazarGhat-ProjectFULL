<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create complaint status histories table
return new class extends Migration
{
    // Apply this change to the database
    public function up(): void
    {
        Schema::create('complaint_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->string('status');
            $table->text('note')->nullable();
            $table->json('photos')->nullable();
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('changed_by_role', ['customer', 'admin', 'delivery', 'system'])->default('system');
            $table->timestamps();
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::dropIfExists('complaint_status_histories');
    }
};
