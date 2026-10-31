<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Migration: create return reasons table
return new class extends Migration
{
    // The reason list customers pick from used to be a hard-coded array in the frontend.
    public function up(): void
    {
        Schema::create('return_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->enum('applies_to', ['Return', 'Refund', 'Both'])->default('Both');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // seed with the options the frontend already offered, so nothing disappears
        $now = now();
        $defaults = [
            'Damaged Packaging',
            'Wrong Item Delivered',
            'Item Expired',
            'Missing Item',
            'Quality Not As Expected',
            'Other',
        ];

        DB::table('return_reasons')->insert(
            collect($defaults)->map(fn (string $label, int $index) => [
                'label' => $label,
                'applies_to' => 'Both',
                'is_active' => true,
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all()
        );
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::dropIfExists('return_reasons');
    }
};
