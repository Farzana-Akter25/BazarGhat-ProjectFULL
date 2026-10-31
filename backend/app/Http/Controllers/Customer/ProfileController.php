<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

// Customer endpoints for editing profile details and password
class ProfileController extends Controller
{
    // Update the customer's name, email, phone and address
    public function update(Request $request)
    {
        // The logged-in customer
        $user = $request->user();

        // Validate the form; the email must stay unique
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
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

        // Fields to save
        $attributes = $request->only('name', 'email', 'address') + ['phone' => $normalizedPhone];

        // a number the customer has just switched to has not been proven yet
        if ($normalizedPhone !== $user->phone) {
            $attributes['phone_verified_at'] = null;
        }

        // Save the changes
        $user->update($attributes);

        return response()->json(['user' => $user->fresh()]);
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
