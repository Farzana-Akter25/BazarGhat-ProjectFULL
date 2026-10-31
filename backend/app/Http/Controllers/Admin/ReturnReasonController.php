<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReturnReason;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Admin endpoints for the list of return/refund reasons customers can pick
class ReturnReasonController extends Controller
{
    // Which request type a reason can be used for
    private const APPLIES_TO = ['Return', 'Refund', 'Both'];

    // List all reasons in their display order
    public function index()
    {
        return response()->json([
            'reasons' => ReturnReason::ordered()->get()->map(fn (ReturnReason $r) => $this->present($r)),
        ]);
    }

    // Add a new reason
    public function store(Request $request)
    {
        // The label must be unique
        $validator = Validator::make($request->all(), [
            'label' => ['required', 'string', 'max:120', Rule::unique('return_reasons', 'label')],
            'applies_to' => ['nullable', Rule::in(self::APPLIES_TO)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $reason = ReturnReason::create([
            'label' => $request->label,
            'applies_to' => $request->input('applies_to', 'Both'),
            'is_active' => $request->boolean('is_active', true),
            // new reasons land at the bottom of the list
            'sort_order' => (int) ReturnReason::max('sort_order') + 1,
        ]);

        return response()->json(['reason' => $this->present($reason)], 201);
    }

    // Update a reason; only the fields sent are changed
    public function update(Request $request, ReturnReason $returnReason)
    {
        // Validation rules; the label stays unique
        $validator = Validator::make($request->all(), [
            'label' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('return_reasons', 'label')->ignore($returnReason->id)],
            'applies_to' => ['sometimes', Rule::in(self::APPLIES_TO)],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Copy the sent fields onto the reason
        $returnReason->fill($request->only(['label', 'applies_to', 'sort_order']));

        if ($request->has('is_active')) {
            $returnReason->is_active = $request->boolean('is_active');
        }

        // Save the changes
        $returnReason->save();

        return response()->json(['reason' => $this->present($returnReason)]);
    }

    // Delete a reason
    public function destroy(ReturnReason $returnReason)
    {
        // Existing requests store the reason as free text
        $returnReason->delete();

        return response()->json(['message' => 'Reason deleted']);
    }

    // Shape a reason into the array the admin page uses
    private function present(ReturnReason $reason): array
    {
        return [
            'id' => $reason->id,
            'label' => $reason->label,
            'appliesTo' => $reason->applies_to,
            'isActive' => $reason->is_active,
            'sortOrder' => $reason->sort_order,
        ];
    }
}
