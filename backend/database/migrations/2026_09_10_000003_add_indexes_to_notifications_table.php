<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Indexes for the two queries the bell actually runs: "this user's notifications, newest first" and "how many of this user's are unread".
return new class extends Migration
{
    // Apply this change to the database
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(
                ['notifiable_type', 'notifiable_id', 'created_at'],
                'notifications_notifiable_created_index',
            );
            $table->index(
                ['notifiable_type', 'notifiable_id', 'read_at'],
                'notifications_notifiable_read_index',
            );
        });
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_notifiable_created_index');
            $table->dropIndex('notifications_notifiable_read_index');
        });
    }
};
