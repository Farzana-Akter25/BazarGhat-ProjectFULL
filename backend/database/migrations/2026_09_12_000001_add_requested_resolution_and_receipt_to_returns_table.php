<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Two gaps in the return flow this closes.
return new class extends Migration
{
    // Apply this change to the database
    public function up(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->enum('requested_resolution', ['Replacement', 'Refund'])
                ->nullable()
                ->after('type');

            $table->timestamp('received_at')->nullable()->after('stock_restored');
            $table->unsignedInteger('restocked_quantity')->default(0)->after('received_at');
            $table->unsignedInteger('damaged_quantity')->default(0)->after('restocked_quantity');
        });

        // Existing rows: a return already settled as a replacement was, in effect, a replacement request; everything else asked for money back.
        DB::table('returns')
            ->where('type', 'Return')
            ->whereNotNull('resolution')
            ->update(['requested_resolution' => DB::raw('resolution')]);

        // Returns approved under the old rule had their stock credited on approval, so record them as received.
        DB::table('returns')
            ->where('stock_restored', true)
            ->whereNull('received_at')
            ->update([
                'received_at' => DB::raw('updated_at'),
                'restocked_quantity' => DB::raw('quantity'),
            ]);
    }

    // Undo this change (used by migrate:rollback)
    public function down(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->dropColumn([
                'requested_resolution',
                'received_at',
                'restocked_quantity',
                'damaged_quantity',
            ]);
        });
    }
};
