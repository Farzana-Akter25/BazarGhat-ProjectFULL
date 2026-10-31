<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Admin endpoints for the return & refund settings
class RefundSettingController extends Controller
{
    // Key the settings are stored under in app_settings
    private const KEY = 'refund_settings';

    // These values steer how the Return & Refund admin
    private const DEFAULTS = [
        'shipping_refundable' => true,
        'refund_sla_days' => 7,
        'high_value_threshold' => 5000,
        'auto_flag_repeat_requests' => 3,
    ];

    // Return the saved settings (filled with defaults) and the defaults themselves
    public function show()
    {
        return response()->json([
            'settings' => AppSetting::group(self::KEY, self::DEFAULTS),
            'defaults' => self::DEFAULTS,
        ]);
    }

    // Save changed refund settings
    public function update(Request $request)
    {
        // Each setting is optional, but must be in range when sent
        $validator = Validator::make($request->all(), [
            'shipping_refundable' => ['sometimes', 'boolean'],
            'refund_sla_days' => ['sometimes', 'integer', 'min:1', 'max:90'],
            'high_value_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'auto_flag_repeat_requests' => ['sometimes', 'integer', 'min:2', 'max:50'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Keep only known setting keys
        $payload = $request->only(array_keys(self::DEFAULTS));

        // Store booleans and numbers as their real types
        if (array_key_exists('shipping_refundable', $payload)) {
            $payload['shipping_refundable'] = $request->boolean('shipping_refundable');
        }

        foreach (['refund_sla_days', 'high_value_threshold', 'auto_flag_repeat_requests'] as $intKey) {
            if (array_key_exists($intKey, $payload)) {
                $payload[$intKey] = (int) $payload[$intKey];
            }
        }

        // Save the settings group
        $settings = AppSetting::putGroup(self::KEY, $payload);

        return response()->json([
            'settings' => array_merge(self::DEFAULTS, $settings),
            'defaults' => self::DEFAULTS,
        ]);
    }
}
