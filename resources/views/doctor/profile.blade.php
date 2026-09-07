<x-layouts.app>
<h2>{{ __('wishubest.directory.profile') }}</h2>
@if(session('status'))<p role="status">{{ session('status') }}</p>@endif
<p>{{ __('wishubest.directory.status') }}: {{ $profile->status->value }}</p>
@if($profile->rejection_reason)<p>{{ $profile->rejection_reason }}</p>@endif
<form method="post" action="{{ route('doctor.profile.update') }}">@csrf @method('put')
<label>{{ __('wishubest.auth.name') }} <input name="display_name" value="{{ old('display_name',$profile->display_name) }}" required></label>
<label>{{ __('wishubest.directory.photo') }} <input name="photo_url" value="{{ old('photo_url',$profile->photo_url) }}"></label>
<label>{{ __('wishubest.directory.biography') }} <textarea name="biography">{{ old('biography',$profile->biography) }}</textarea></label>
@foreach(['specialties'=>$specialties,'locations'=>$locations,'medical_services'=>$services] as $field=>$options)<fieldset><legend>{{ __('wishubest.directory.'.($field === 'medical_services' ? 'services' : $field)) }}</legend>@foreach($options as $option)<label><input type="checkbox" name="{{ $field }}[]" value="{{ $option->id }}" @checked(in_array($option->id, old($field,$profile->{$field === 'medical_services' ? 'medicalServices' : $field}->pluck('id')->all())))> {{ $option->name }}</label>@endforeach</fieldset>@endforeach
<button>{{ __('wishubest.directory.saved') }}</button></form>
<form method="post" action="{{ route('doctor.profile.submit') }}">@csrf <button>{{ __('wishubest.directory.submit') }}</button></form>
</x-layouts.app>
