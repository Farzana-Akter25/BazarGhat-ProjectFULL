<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

// Delivery man endpoints for profile, activation and password
class ProfileController extends Controller
{
    // Update the delivery man's account and vehicle details
    public function update(Request $request)
    {
        // The logged-in user and their delivery profile
        $user = $request->user();
        $profile = $user->deliveryProfile;

        // Validate the form; the email must stay unique
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'area' => 'nullable|string|max:255',
            'vehicle_type' => 'nullable|string|max:100',
            'vehicle_number' => 'nullable|string|max:50',
            'avatar' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Keep the old phone unless a new one is sent
        $normalizedPhone = $user->phone;

        // Convert a new phone to the standard format; refuse if invalid
        if ($request->filled('phone')) {
            $normalizedPhone = Phone::normalize($request->phone);

            if (! $normalizedPhone) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['phone' => ['Enter a valid Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX).']],
                ], 422);
            }
        }

        // Save account fields on the user and vehicle fields on the profile
        $user->update($request->only('name', 'email') + ['phone' => $normalizedPhone]);
        $profile->update($request->only('area', 'vehicle_type', 'vehicle_number', 'avatar'));

        // Send back the updated rider details
        return response()->json([
            'rider' => [
                'name' => $user->name,
                'status' => $user->status,
                'phone' => $user->phone,
                'phone_verified_at' => $user->phone_verified_at,
                'email' => $user->email,
                'area' => $profile->area,
                'vehicle' => $profile->vehicle_type,
                'vehicleNumber' => $profile->vehicle_number,
                'avatar' => $profile->avatar,
            ],
        ]);
    }

    // Switch an inactive delivery man back to active
    public function activate(Request $request)
    {
        $user = $request->user();

        // Only an inactive account can be activated
        if ($user->status !== 'Inactive') {
            return response()->json([
                'message' => 'Only an inactive account can be activated.',
            ], 422);
        }

        // Mark the account active
        $user->update(['status' => 'Active']);

        return response()->json([
            'rider' => [
                'status' => $user->status,
            ],
        ]);
    }

    // Change password after checking the current one
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        // Current password and a confirmed new password are required
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // The current password must match
        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        // Save the new hashed password
        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password updated successfully.']);
    }
}
