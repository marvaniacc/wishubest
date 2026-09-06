<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_test_suite_uses_postgresql_for_migrations_and_queries(): void
    {
        $this->assertSame('pgsql', config('database.default'));
        $this->assertStringStartsWith('PostgreSQL', DB::selectOne('select version() as version')->version);
        $this->assertDatabaseCount('users', 0);
    }
}
