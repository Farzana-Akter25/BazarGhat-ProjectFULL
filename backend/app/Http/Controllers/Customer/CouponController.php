<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Services\CouponService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\HttpException;

// Customer endpoints for checking and applying coupons
class CouponController extends Controller
{
    // Inject the coupon service
    public function __construct(private CouponService $coupons)
    {
    }

    // The coupon(s) this customer can apply to the current cart
    public function available(Request $request)
    {
        // Order subtotal sent by the frontend (never negative)
        $subtotal = max(0, (int) $request->query('subtotal', 0));
        $user = $request->user();

        return response()->json([
            'coupons' => $this->coupons->eligibleCoupons($user, $subtotal)->map(fn (Coupon $c) => $this->present($c))->values(),
        ]);
    }

    // Dry-run validation of a manually-entered coupon code.
    public function apply(Request $request)
    {
        // Code and subtotal are required
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'subtotal' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Check the code without actually using it; send back the error on failure
        $user = $request->user();
        $subtotal = (int) $request->subtotal;

        try {
            $result = $this->coupons->resolveForCheckout($user, strtoupper(trim($request->code)), $subtotal);
        } catch (\Throwable $e) {
            $status = $e instanceof HttpException ? $e->getStatusCode() : 422;

            return response()->json(['message' => $e->getMessage() ?: 'Invalid or expired coupon code.'], $status);
        }

        // Code is valid: send back the coupon details
        return response()->json([
            'message' => $result['freeDelivery']
                ? 'Coupon applied — free delivery on this order!'
                : 'Coupon applied — you save ৳' . $result['discount'] . '!',
            'coupon' => [
                'code' => $result['coupon']->coupon_code,
                'type' => $result['coupon']->coupon_type,
                'label' => $this->coupons->describe($result['coupon']),
                'freeDelivery' => $result['freeDelivery'],
                'discount' => $result['discount'],
            ],
        ]);
    }

    // Shape a coupon for the checkout page
    private function present(Coupon $coupon): array
    {
        return [
            'code' => $coupon->coupon_code,
            'type' => $coupon->coupon_type,
            'label' => $this->coupons->describe($coupon),
            'minimumOrder' => $coupon->minimum_order,
        ];
    }
}
