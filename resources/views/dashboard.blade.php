<x-layouts.app>
    <h2>{{ __('wishubest.dashboard.title') }}</h2>
    <p>{{ __('wishubest.dashboard.signed_in_as', ['name' => auth()->user()->name]) }}</p>
    <form method="post" action="{{ route('logout') }}">
        @csrf
        @method('delete')
        <button type="submit">{{ __('wishubest.auth.sign_out') }}</button>
    </form>
</x-layouts.app>
