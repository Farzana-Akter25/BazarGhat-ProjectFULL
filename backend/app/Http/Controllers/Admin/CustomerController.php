<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Admin endpoints for managing customers
class CustomerController extends Controller
{
    // List all customers with their order count and total spending
    public function index()
    {
        $customers = User::where('role', 'customer')
            ->withCount('orders')
            // Only completed purchases count: delivered orders, excluding free replacements
            ->withSum(['orders as total_spent' => fn ($q) => $q
                ->where('status', 'Delivered')
                ->where('is_replacement', false),
            ], 'total_amount')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'customers' => $customers->map(fn (User $customer) => $this->present($customer)),
        ]);
    }

    // Block or unblock a customer
    public function toggleStatus(Request $request, User $customer)
    {
        // Only "Active" or "Blocked" are allowed
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:Active,Blocked',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $customer->update(['status' => $request->status]);

        return response()->json(['customer' => $this->present($customer->fresh())]);
    }

    // Delete a customer account
    public function destroy(User $customer)
    {
        $customer->delete();

        return response()->json(['message' => 'Customer deleted']);
    }

    // Shape a customer into the array the admin page uses
    private function present(User $customer): array
    {
        $spent = (int) ($customer->total_spent ?? 0);

        return [
            // Same customer code the complaint and return screens show ("CUST0001")
            'id' => 'CUST' . str_pad($customer->id, 4, '0', STR_PAD_LEFT),
            'userId' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'orders' => (int) ($customer->orders_count ?? 0),
            'spent' => 'TK ' . number_format($spent),
            'status' => $customer->status,
        ];
    }
}
