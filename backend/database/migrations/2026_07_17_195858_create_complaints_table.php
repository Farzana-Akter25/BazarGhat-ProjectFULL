<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create complaints table
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('complaint_number')->unique();
            $table->enum('complaint_type', ['delivery_man', 'customer'])->comment('delivery_man = filed by a customer against a delivery man; customer = filed by a delivery man against a customer');
            $table->string('filer_name');
            $table->string('filer_code')->nullable();
            $table->string('against_name');
            $table->string('against_code')->nullable();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('order_reference')->nullable();
            $table->string('reason');
            $table->enum('status', ['Pending', 'In Review', 'Resolved'])->default('Pending');
            $table->timestamps();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
