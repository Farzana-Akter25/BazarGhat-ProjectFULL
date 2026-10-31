<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create delivery profiles table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::create('delivery_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('staff_code')->unique();
            $table->string('area')->nullable();
            $table->decimal('rating', 3, 1)->default(0);
            $table->decimal('on_time_percentage', 5, 1)->default(0);
            $table->unsignedInteger('total_deliveries')->default(0);
            $table->timestamps();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('delivery_profiles');
    }
};
