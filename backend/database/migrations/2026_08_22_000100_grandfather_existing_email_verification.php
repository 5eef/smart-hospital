<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Intentionally non-mutating. Legacy verification requires a separate,
        // reviewed administrative procedure with explicit account criteria.
    }

    public function down(): void
    {
        // Existing accounts cannot be distinguished safely from later verified accounts.
    }
};
