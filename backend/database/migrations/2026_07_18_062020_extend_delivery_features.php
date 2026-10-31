<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: extend delivery features
return new class extends Migration
{
    // Run the migrations.
    public function up(): void
    {
        Schema::table('delivery_assignments', function (Blueprint $table) {
            $table->enum('rider_status', ['Assigned', 'On The Way', 'Picked Up', 'Delivered', 'Failed'])
                ->default('Assigned')
                ->after('status');
        });

        Schema::table('delivery_profiles', function (Blueprint $table) {
            $table->string('vehicle_type')->nullable()->after('area');
            $table->string('vehicle_number')->nullable()->after('vehicle_type');
            $table->text('avatar')->nullable()->after('vehicle_number');
        });

        Schema::create('delivery_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_profile_id')->constrained('delivery_profiles')->cascadeOnDelete();
            $table->enum('type', ['Day Off', 'Route Change', 'Fuel Expense', 'Vehicle Issue', 'Other']);
            $table->text('message');
            $table->enum('status', ['Pending', 'Approved', 'Rejected'])->default('Pending');
            $table->timestamps();
        });

        Schema::create('delivery_issue_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_assignment_id')->constrained('delivery_assignments')->cascadeOnDelete();
            $table->foreignId('delivery_profile_id')->constrained('delivery_profiles')->cascadeOnDelete();
            $table->enum('condition', ['Good', 'Minor Issue', 'Major Issue', 'Damaged']);
            $table->text('comment');
            $table->text('photo')->nullable();
            $table->timestamps();
        });
    }

    // Reverse the migrations.
    public function down(): void
    {
        Schema::dropIfExists('delivery_issue_reports');
        Schema::dropIfExists('delivery_requests');

        Schema::table('delivery_profiles', function (Blueprint $table) {
            $table->dropColumn(['vehicle_type', 'vehicle_number', 'avatar']);
        });

        Schema::table('delivery_assignments', function (Blueprint $table) {
            $table->dropColumn('rider_status');
        });
    }
};
