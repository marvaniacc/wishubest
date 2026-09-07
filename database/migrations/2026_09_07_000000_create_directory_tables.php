<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctors', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->timestamps();
        });
        Schema::create('doctor_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('doctor_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('slug')->unique();
            $t->string('display_name');
            $t->string('photo_url')->nullable();
            $t->text('biography')->nullable();
            $t->string('status')->default('draft')->index();
            $t->timestamp('submitted_at')->nullable();
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('rejection_reason')->nullable();
            $t->timestamps();
        });
        foreach (['specialties', 'locations', 'medical_services'] as $table) {
            Schema::create($table, function (Blueprint $t) {
                $t->id();
                $t->string('name');
                $t->string('slug')->unique();
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }
        Schema::create('doctor_profile_specialty', function (Blueprint $t) {
            $t->foreignId('doctor_profile_id')->constrained()->cascadeOnDelete();
            $t->foreignId('specialty_id')->constrained()->restrictOnDelete();
            $t->primary(['doctor_profile_id', 'specialty_id']);
        });
        Schema::create('doctor_profile_location', function (Blueprint $t) {
            $t->foreignId('doctor_profile_id')->constrained()->cascadeOnDelete();
            $t->foreignId('location_id')->constrained()->restrictOnDelete();
            $t->primary(['doctor_profile_id', 'location_id']);
        });
        Schema::create('doctor_profile_medical_service', function (Blueprint $t) {
            $t->foreignId('doctor_profile_id')->constrained()->cascadeOnDelete();
            $t->foreignId('medical_service_id')->constrained()->restrictOnDelete();
            $t->primary(['doctor_profile_id', 'medical_service_id']);
        });
    }

    public function down(): void
    {
        foreach (['doctor_profile_medical_service', 'doctor_profile_location', 'doctor_profile_specialty', 'medical_services', 'locations', 'specialties', 'doctor_profiles', 'doctors'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
