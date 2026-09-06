<x-layouts.app>
    <h2>{{ __('wishubest.auth.sign_in') }}</h2>
    <form method="post" action="{{ route('login.store') }}">
        @csrf
        <label for="email">{{ __('wishubest.auth.email') }}</label>
        <input id="email" name="email" type="email" value="{{ old('email') }}" autocomplete="email" required>
        <label for="password">{{ __('wishubest.auth.password') }}</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <label for="remember"><input id="remember" name="remember" type="checkbox" value="1"> {{ __('wishubest.auth.remember') }}</label>
        <button type="submit">{{ __('wishubest.auth.sign_in') }}</button>
    </form>
    <a href="{{ route('register') }}">{{ __('wishubest.auth.register') }}</a>
</x-layouts.app>
