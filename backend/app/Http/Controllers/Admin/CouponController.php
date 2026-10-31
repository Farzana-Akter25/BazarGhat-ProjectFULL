<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Services\CouponService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Admin endpoints for coupons: the system free-delivery ones plus the admin's own campaigns.
class CouponController extends Controller
{
    // Inject the coupon service
    public function __construct(private CouponService $coupons)
    {
    }

    // List coupons with search and pagination
    public function index(Request $request)
    {
        // "Used" counts people
        $query = Coupon::query()
            ->with('customers:id,name,email,phone')
            ->withCount(['usages as users_count' => function ($q) {
                $q->select(DB::raw('count(distinct customer_id)'));
            }]);

        // Search by coupon code or campaign name
        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('coupon_code', 'like', '%' . $search . '%')
                    ->orWhere('campaign_name', 'like', '%' . $search . '%');
            });
        }

        // Page size: default 10, capped at 100
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        // Newest coupons first
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        // Return the coupons plus pagination info
        return response()->json([
            'coupons' => collect($paginator->items())->map(fn (Coupon $coupon) => $this->present($coupon)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            // whole-table counts for the stat cards
            'counts' => [
                'total' => Coupon::count(),
                'active' => Coupon::where('status', 'active')->count(),
                'inactive' => Coupon::where('status', 'inactive')->count(),
                'selected' => Coupon::where('generated_by', 'Admin')->where('audience', 'selected')->count(),
            ],
        ]);
    }

    // Create an admin coupon
    public function store(Request $request)
    {
        $validator = $this->validator($request);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $coupon = DB::transaction(function () use ($data, $request) {
            $coupon = Coupon::create($this->attributes($data) + ['generated_by' => 'Admin']);

            return $this->syncCustomers($coupon, $data, $request->user());
        });

        return response()->json(['coupon' => $this->present($coupon->fresh('customers'))], 201);
    }

    // Edit an admin coupon
    public function update(Request $request, Coupon $coupon)
    {
        // the system coupons are fixed; they can only be switched on or off
        if ($coupon->generated_by === 'System') {
            return response()->json(['message' => 'System coupons cannot be edited. You can only activate or deactivate them.'], 422);
        }

        $validator = $this->validator($request, $coupon);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        DB::transaction(function () use ($coupon, $data, $request) {
            $coupon->update($this->attributes($data));
            $this->syncCustomers($coupon, $data, $request->user());
        });

        return response()->json(['coupon' => $this->present($coupon->fresh('customers'))]);
    }

    // Activate or deactivate any coupon
    public function toggleStatus(Request $request, Coupon $coupon)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $coupon->update(['status' => $request->status]);

        return response()->json(['coupon' => $this->present($coupon->fresh('customers'))]);
    }

    // Delete an admin coupon that nobody has used yet
    public function destroy(Coupon $coupon)
    {
        if ($coupon->generated_by === 'System') {
            return response()->json(['message' => 'System coupons cannot be deleted.'], 422);
        }

        // deleting would wipe its usage history out of the reports
        if ($coupon->usages()->exists()) {
            return response()->json(['message' => 'This coupon has already been used on orders. Deactivate it instead.'], 422);
        }

        $coupon->delete();

        return response()->json(['message' => 'Coupon deleted']);
    }

    // Validation rules shared by create and edit
    private function validator(Request $request, ?Coupon $coupon = null)
    {
        // codes are stored upper-case
        $request->merge(['coupon_code' => strtoupper(trim((string) $request->input('coupon_code')))]);

        $isPercentage = $request->input('coupon_type') === 'percentage_discount';

        return Validator::make($request->all(), [
            'coupon_code' => [
                'required', 'string', 'max:30', 'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('coupons', 'coupon_code')->ignore($coupon?->id),
            ],
            'campaign_name' => 'nullable|string|max:255',
            'coupon_type' => 'required|in:free_delivery,fixed_discount,percentage_discount',
            'discount_value' => 'exclude_if:coupon_type,free_delivery|required|integer|min:1' . ($isPercentage ? '|max:100' : ''),
            'max_discount' => 'nullable|integer|min:1',
            'minimum_order' => 'nullable|integer|min:0',
            'start_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after_or_equal:start_date',
            'usage_limit' => 'nullable|integer|min:1',
            'per_user_limit' => 'nullable|integer|min:1',
            'first_order_only' => 'sometimes|boolean',
            'min_completed_orders' => 'nullable|integer|min:1',
            'min_total_spent' => 'nullable|integer|min:1',
            'audience' => 'required|in:all,selected',
            'customer_ids' => 'exclude_unless:audience,selected|required|array|min:1',
            'customer_ids.*' => [
                'integer',
                Rule::exists('users', 'id')->where('role', 'customer'),
            ],
            'status' => 'sometimes|in:active,inactive',
        ], [
            'coupon_code.regex' => 'Use only letters, numbers, - and _ in the coupon code.',
            'customer_ids.required' => 'Pick at least one customer for this coupon.',
            'discount_value.max' => 'A percentage discount cannot be more than 100.',
        ]);
    }

    // Validated input -> coupon columns
    private function attributes(array $data): array
    {
        $type = $data['coupon_type'];

        return [
            'coupon_code' => $data['coupon_code'],
            'campaign_name' => $data['campaign_name'] ?? null,
            'coupon_type' => $type,
            'discount_value' => $type === 'free_delivery' ? null : $data['discount_value'],
            // only a percentage coupon needs a ceiling
            'max_discount' => $type === 'percentage_discount' ? ($data['max_discount'] ?? null) : null,
            'minimum_order' => $data['minimum_order'] ?? null,
            'start_date' => $data['start_date'] ?? null,
            'expiry_date' => $data['expiry_date'] ?? null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'per_user_limit' => $data['per_user_limit'] ?? null,
            'first_order_only' => (bool) ($data['first_order_only'] ?? false),
            'min_completed_orders' => $data['min_completed_orders'] ?? null,
            'min_total_spent' => $data['min_total_spent'] ?? null,
            'audience' => $data['audience'],
            'status' => $data['status'] ?? 'active',
        ];
    }

    // Keep the hand-picked customer list in step and tell newly added customers about their coupon
    private function syncCustomers(Coupon $coupon, array $data, ?User $admin): Coupon
    {
        if ($data['audience'] !== 'selected') {
            $coupon->customers()->detach();

            return $coupon;
        }

        $pivot = ['assigned_by' => $admin?->id, 'assignment_type' => 'Admin'];
        $ids = collect($data['customer_ids'])->unique()->mapWithKeys(fn ($id) => [(int) $id => $pivot])->all();

        // existing rows keep their used flag; only new ones are attached
        $changes = $coupon->customers()->syncWithoutDetaching($ids);
        $coupon->customers()->detach(array_diff($coupon->customers()->pluck('users.id')->all(), array_keys($ids)));

        if ($coupon->status === 'active' && $changes['attached']) {
            $notifications = app(NotificationService::class);

            User::whereIn('id', $changes['attached'])->get()->each(fn (User $customer) => $notifications->send(
                $customer,
                NotificationService::COUPON_ASSIGNED,
                'You got a coupon!',
                "Use code {$coupon->coupon_code} at checkout: " . $this->coupons->describe($coupon) . '.',
                null,
                null,
                SystemNotification::PRIORITY_SUCCESS,
                "COUPON_ASSIGNED:coupon:{$coupon->id}",
            ));
        }

        return $coupon;
    }

    // Shape a coupon into the array the admin page uses
    private function present(Coupon $coupon): array
    {
        return [
            'id' => $coupon->id,
            'coupon_code' => $coupon->coupon_code,
            'campaign_name' => $coupon->campaign_name,
            'coupon_type' => $coupon->coupon_type,
            'discount_value' => $coupon->discount_value,
            'max_discount' => $coupon->max_discount,
            'minimum_order' => $coupon->minimum_order,
            'start_date' => $coupon->start_date?->toDateString(),
            'expiry_date' => $coupon->expiry_date?->toDateString(),
            'usage_limit' => $coupon->usage_limit,
            'per_user_limit' => $coupon->per_user_limit,
            'first_order_only' => (bool) $coupon->first_order_only,
            'min_completed_orders' => $coupon->min_completed_orders,
            'min_total_spent' => $coupon->min_total_spent,
            'audience' => $coupon->audience,
            'customers' => $coupon->audience === 'selected'
                ? $coupon->customers->map(fn (User $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'email' => $c->email,
                    'phone' => $c->phone,
                    'used' => (bool) $c->pivot->is_used,
                ])->values()
                : [],
            'generated_by' => $coupon->generated_by,
            'status' => $coupon->status,
            // how many distinct customers have used this coupon
            'used_count' => $coupon->users_count ?? $coupon->usages()->distinct('customer_id')->count('customer_id'),
            // uses on orders that still stand, for the usage-limit column
            'total_uses' => $this->coupons->usageCount($coupon),
        ];
    }
}
