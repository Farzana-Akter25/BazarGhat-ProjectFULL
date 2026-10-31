<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create refund logs table
return new class extends Migration
{
    // Audit trail for a refund: every status change, every gateway call and every failure, in order.
    public function up(): void
    {
        Schema::create('refund_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('refund_id')->constrained('refunds')->cascadeOnDelete();
            $table->string('event');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->text('message')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['refund_id', 'id']);
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::dropIfExists('refund_logs');
    }
};
