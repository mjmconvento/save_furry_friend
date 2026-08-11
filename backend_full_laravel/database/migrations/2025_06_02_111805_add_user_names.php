<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('name');
            $table->string('first_name');
            $table->string('middle_name')
                ->nullable();
            $table->string('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('name');
            $table->dropColumn(['first_name', 'middle_name', 'last_name']);
        });
    }
};
