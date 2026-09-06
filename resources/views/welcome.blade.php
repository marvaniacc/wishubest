<x-layouts.app>
    <p>{{ __('wishubest.foundation.ready') }}</p>
    @guest
        <a href="{{ route('login') }}">{{ __('wishubest.auth.sign_in') }}</a>
        <a href="{{ route('register') }}">{{ __('wishubest.auth.register') }}</a>
    @else
        <a href="{{ route('dashboard') }}">{{ __('wishubest.dashboard.title') }}</a>
    @endguest
</x-layouts.app>
