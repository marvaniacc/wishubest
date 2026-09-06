<?php

namespace Tests\Feature\Localization;

use Tests\TestCase;

class LocalizationCatalogTest extends TestCase
{
    public function test_english_catalog_contains_the_authentication_copy(): void
    {
        app()->setLocale('en');

        $this->assertSame('Sign in', __('wishubest.auth.sign_in'));
        $this->assertSame('Your account', __('wishubest.dashboard.title'));
    }

    public function test_spanish_catalog_contains_the_authentication_copy(): void
    {
        app()->setLocale('es');

        $this->assertSame('Iniciar sesión', __('wishubest.auth.sign_in'));
        $this->assertSame('Tu cuenta', __('wishubest.dashboard.title'));
    }
}
