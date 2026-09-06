<x-layouts.app>
    <h2>{{ __('wishubest.auth.register') }}</h2>
    <form method="post" action="{{ route('register.store') }}">
        @csrf
        <label for="name">{{ __('wishubest.auth.name') }}</label>
        <input id="name" name="name" type="text" value="{{ old('name') }}" autocomplete="name" required>
        <label for="email">{{ __('wishubest.auth.email') }}</label>
        <input id="email" name="email" type="email" value="{{ old('email') }}" autocomplete="email" required>
        <label for="password">{{ __('wishubest.auth.password') }}</label>
        <input id="password" name="password" type="password" autocomplete="new-password" required>
        <label for="password_confirmation">{{ __('wishubest.auth.password_confirmation') }}</label>
        <input id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" required>
        <button type="submit">{{ __('wishubest.auth.register') }}</button>
    </form>
    <a href="{{ route('login') }}">{{ __('wishubest.auth.sign_in') }}</a>
</x-layouts.app>
