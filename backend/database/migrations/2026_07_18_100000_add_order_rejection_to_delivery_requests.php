<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: add order rejection to delivery requests
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        DB::statement("ALTER TABLE delivery_requests MODIFY type ENUM('Day Off', 'Route Change', 'Fuel Expense', 'Vehicle Issue', 'Order Rejection', 'Other') NOT NULL");

        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->foreignId('delivery_assignment_id')
                ->nullable()
                ->after('delivery_profile_id')
                ->constrained('delivery_assignments')
                ->nullOnDelete();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_assignment_id');
        });

        DB::statement("ALTER TABLE delivery_requests MODIFY type ENUM('Day Off', 'Route Change', 'Fuel Expense', 'Vehicle Issue', 'Other') NOT NULL");
    }
};
