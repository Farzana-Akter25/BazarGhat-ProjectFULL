<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Key/value settings stored in the app_settings table
class AppSetting extends Model
{
    // The primary key is the text "key" column, not an auto id
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    // Columns that may be mass-assigned
    protected $fillable = [
        'key',
        'value',
    ];

    // Store the value as JSON and read it back as an array
    protected $casts = [
        'value' => 'array',
    ];

    // Reads a settings group
    public static function group(string $key, array $defaults = []): array
    {
        $stored = static::find($key)?->value ?? [];

        return array_merge($defaults, is_array($stored) ? $stored : []);
    }

    // Writes a settings group, merging over whatever is already stored.
    public static function putGroup(string $key, array $values): array
    {
        $setting = static::firstOrNew(['key' => $key]);
        $setting->value = array_merge(is_array($setting->value) ? $setting->value : [], $values);
        $setting->save();

        return $setting->value;
    }
}
