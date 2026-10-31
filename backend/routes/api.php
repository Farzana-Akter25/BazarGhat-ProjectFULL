<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin\ComplaintController;
use App\Http\Controllers\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DeliveryAssignmentController;
use App\Http\Controllers\Admin\DeliveryController;
use App\Http\Controllers\Admin\DeliveryIssueReportController as AdminDeliveryIssueReportController;
use App\Http\Controllers\Admin\DeliveryRequestController as AdminDeliveryRequestController;
use App\Http\Controllers\Admin\FlashSaleController as AdminFlashSaleController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\RefundController as AdminRefundController;
use App\Http\Controllers\Admin\RefundSettingController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ReturnController;
use App\Http\Controllers\Admin\ReturnReasonController;
use App\Http\Controllers\FlashSaleController as PublicFlashSaleController;
use App\Http\Controllers\Customer\CartController;
use App\Http\Controllers\Customer\CheckoutController;
use App\Http\Controllers\Customer\ComplaintController as CustomerComplaintController;
use App\Http\Controllers\Customer\CouponController as CustomerCouponController;
use App\Http\Controllers\Customer\InvoiceController as CustomerInvoiceController;
use App\Http\Controllers\Customer\OrderController as CustomerOrderController;
use App\Http\Controllers\Customer\PhoneVerificationController;
use App\Http\Controllers\Customer\ProfileController as CustomerProfileController;
use App\Http\Controllers\Customer\RefundController as CustomerRefundController;
use App\Http\Controllers\Customer\ReturnController as CustomerReturnController;
use App\Http\Controllers\Customer\WalletController as CustomerWalletController;
use App\Http\Controllers\Delivery\AssignedOrdersController;
use App\Http\Controllers\Delivery\ComplaintController as DeliveryComplaintController;
use App\Http\Controllers\Delivery\DashboardController as DeliveryDashboardController;
use App\Http\Controllers\Delivery\HistoryController as DeliveryHistoryController;
use App\Http\Controllers\Delivery\IssueReportController;
use App\Http\Controllers\Delivery\ProfileController as DeliveryProfileController;
use App\Http\Controllers\Delivery\RequestController as DeliveryRequestController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController as PublicProductController;

// API Routes: API routes for the application are registered here.

// Return the logged-in user (any role)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Auth routes
Route::post('/login', [AuthController::class, 'login']);

// Sign-up and forgot-password routes: max 6 requests per minute
Route::middleware('throttle:6,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/register/verify-otp', [AuthController::class, 'verifyRegistrationOtp']);
    Route::post('/register/resend-otp', [AuthController::class, 'resendRegistrationOtp']);

    Route::post('/forgot-password/check', [AuthController::class, 'forgotPasswordCheck']);
    Route::post('/forgot-password/send-email-otp', [AuthController::class, 'forgotPasswordSendEmailOtp']);
    Route::post('/forgot-password/resend-otp', [AuthController::class, 'resendForgotPasswordOtp']);
    Route::post('/forgot-password/verify-email-otp', [AuthController::class, 'forgotPasswordVerifyEmailOtp']);
});

Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Public storefront routes
Route::get('/products', [PublicProductController::class, 'index']);
Route::get('/products/{product}', [PublicProductController::class, 'show']);
Route::get('/flash-sales', [PublicFlashSaleController::class, 'index']);
Route::get('/flash-sales/active', [PublicFlashSaleController::class, 'active']);

// SSLCommerz payment gateway callbacks (public — invoked by SSLCommerz, not the SPA)
Route::post('/payment/sslcommerz/success', [PaymentController::class, 'success']);
Route::post('/payment/sslcommerz/fail', [PaymentController::class, 'fail']);
Route::post('/payment/sslcommerz/cancel', [PaymentController::class, 'cancel']);
Route::post('/payment/sslcommerz/ipn', [PaymentController::class, 'ipn']);
// Routes for any logged-in user
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
});

// Admin routes
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Dashboard cards and chart
    Route::get('/dashboard', [DashboardController::class, 'summary']);

    // Notification bell
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
    Route::get('/sales-analytics', [DashboardController::class, 'analytics']);

    // Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    // Flash sales
    Route::get('/flash-sales', [AdminFlashSaleController::class, 'index']);
    Route::post('/flash-sales', [AdminFlashSaleController::class, 'store']);
    Route::put('/flash-sales/{flashSale}', [AdminFlashSaleController::class, 'update']);
    Route::delete('/flash-sales/{flashSale}', [AdminFlashSaleController::class, 'destroy']);

    // Coupons
    Route::get('/coupons', [AdminCouponController::class, 'index']);
    Route::post('/coupons', [AdminCouponController::class, 'store']);
    Route::put('/coupons/{coupon}', [AdminCouponController::class, 'update']);
    Route::patch('/coupons/{coupon}/status', [AdminCouponController::class, 'toggleStatus']);
    Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Inventory and stock history
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::patch('/inventory/{product}', [InventoryController::class, 'update']);
    Route::get('/inventory-transactions', [InventoryController::class, 'transactions']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::patch('/customers/{customer}/status', [CustomerController::class, 'toggleStatus']);
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);

    // Delivery staff
    Route::get('/delivery-staff', [DeliveryController::class, 'index']);
    Route::post('/delivery-staff', [DeliveryController::class, 'store']);
    Route::get('/delivery-staff/{deliveryProfile}', [DeliveryController::class, 'show']);
    Route::patch('/delivery-staff/{deliveryProfile}/status', [DeliveryController::class, 'toggleStatus']);
    Route::delete('/delivery-staff/{deliveryProfile}', [DeliveryController::class, 'destroy']);

    // Delivery assignments
    Route::get('/delivery-assignments', [DeliveryAssignmentController::class, 'index']);
    Route::post('/delivery-assignments', [DeliveryAssignmentController::class, 'store']);
    Route::patch('/delivery-assignments/{deliveryAssignment}/status', [DeliveryAssignmentController::class, 'updateStatus']);

    // Delivery man requests
    Route::get('/delivery-requests', [AdminDeliveryRequestController::class, 'index']);
    Route::patch('/delivery-requests/{deliveryRequest}/status', [AdminDeliveryRequestController::class, 'updateStatus']);
    Route::delete('/delivery-requests/{deliveryRequest}', [AdminDeliveryRequestController::class, 'destroy']);

    // Invoices
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{order}', [InvoiceController::class, 'show']);

    // business performance report behind the invoice screen's date presets
    Route::get('/reports', [ReportController::class, 'index']);

    // Return and refund requests
    Route::get('/returns', [ReturnController::class, 'index']);
    Route::patch('/returns/{returnRequest}/status', [ReturnController::class, 'updateStatus']);
    Route::patch('/returns/{returnRequest}/resolve', [ReturnController::class, 'resolve']);
    Route::patch('/returns/{returnRequest}/receive', [ReturnController::class, 'receiveItems']);
    Route::patch('/returns/{returnRequest}/refund-status', [ReturnController::class, 'updateRefundStatus']);
    Route::get('/returns/{returnRequest}/refund-options', [ReturnController::class, 'refundOptions']);
    Route::delete('/returns/{returnRequest}', [ReturnController::class, 'destroy']);

    // Return reasons list
    Route::get('/return-reasons', [ReturnReasonController::class, 'index']);
    Route::post('/return-reasons', [ReturnReasonController::class, 'store']);
    Route::patch('/return-reasons/{returnReason}', [ReturnReasonController::class, 'update']);
    Route::delete('/return-reasons/{returnReason}', [ReturnReasonController::class, 'destroy']);

    // Refunds, however they were raised.
    Route::get('/refunds', [AdminRefundController::class, 'index']);
    Route::get('/refunds/{refund}', [AdminRefundController::class, 'show']);
    Route::post('/refunds/{refund}/approve', [AdminRefundController::class, 'approve']);
    Route::post('/refunds/{refund}/reject', [AdminRefundController::class, 'reject']);
    Route::post('/refunds/{refund}/sync', [AdminRefundController::class, 'sync']);

    // Refund settings
    Route::get('/refund-settings', [RefundSettingController::class, 'show']);
    Route::put('/refund-settings', [RefundSettingController::class, 'update']);

    // Delivery issue reports
    Route::get('/delivery-issue-reports', [AdminDeliveryIssueReportController::class, 'index']);
    Route::delete('/delivery-issue-reports/{deliveryIssueReport}', [AdminDeliveryIssueReportController::class, 'destroy']);

    // Complaints
    Route::get('/complaints', [ComplaintController::class, 'index']);
    Route::patch('/complaints/{complaint}/start-review', [ComplaintController::class, 'startReview']);
    Route::patch('/complaints/{complaint}/request-info', [ComplaintController::class, 'requestInfo']);
    Route::patch('/complaints/{complaint}/resolve', [ComplaintController::class, 'resolve']);
    Route::patch('/complaints/{complaint}/reject', [ComplaintController::class, 'reject']);
    Route::delete('/complaints/{complaint}', [ComplaintController::class, 'destroy']);
});

// Customer routes
Route::middleware(['auth:sanctum', 'customer'])->prefix('customer')->group(function () {
    // Cart
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::patch('/cart/{product}', [CartController::class, 'update']);
    Route::delete('/cart/{product}', [CartController::class, 'destroy']);
    Route::delete('/cart', [CartController::class, 'clear']);

    // checkout contact number verification — throttled because every send costs real money once a live SMS provider is configured
    Route::post('/phone/send-otp', [PhoneVerificationController::class, 'send'])->middleware('throttle:6,1');
    Route::post('/phone/verify-otp', [PhoneVerificationController::class, 'verify'])->middleware('throttle:10,1');

    // Place an order
    Route::post('/checkout', [CheckoutController::class, 'store']);

    // Orders
    Route::get('/orders', [CustomerOrderController::class, 'index']);
    Route::get('/orders/{order}', [CustomerOrderController::class, 'show']);
    Route::get('/orders/{order}/refund-options', [CustomerOrderController::class, 'refundOptions']);
    Route::patch('/orders/{order}/cancel', [CustomerOrderController::class, 'cancel']);
    Route::delete('/orders/{order}', [CustomerOrderController::class, 'destroy']);

    // Refund balance and refund history.
    Route::get('/wallet', [CustomerWalletController::class, 'show']);
    Route::get('/wallet/transactions', [CustomerWalletController::class, 'transactions']);
    Route::get('/refunds', [CustomerRefundController::class, 'index']);
    Route::get('/refunds/{refund}', [CustomerRefundController::class, 'show']);

    // Return and refund requests
    Route::get('/returns', [CustomerReturnController::class, 'index']);
    Route::get('/return-reasons', [CustomerReturnController::class, 'reasons']);
    // Which refund destinations this order could support, for the preference the customer states on the request form.
    Route::get('/returns/refund-options/{order}', [CustomerReturnController::class, 'refundOptions']);
    Route::post('/returns', [CustomerReturnController::class, 'store']);

    // Complaints
    Route::get('/complaints', [CustomerComplaintController::class, 'index']);
    Route::post('/complaints', [CustomerComplaintController::class, 'store']);
    Route::post('/complaints/{complaint}/respond', [CustomerComplaintController::class, 'respond']);
    Route::delete('/complaints/{complaint}', [CustomerComplaintController::class, 'destroy']);

    // Notification bell
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    // Profile and password
    Route::put('/profile', [CustomerProfileController::class, 'update']);
    Route::put('/password', [CustomerProfileController::class, 'updatePassword']);

    // Invoice for an order
    Route::get('/invoices/{order}', [CustomerInvoiceController::class, 'show']);

    // Coupons at checkout
    Route::get('/coupons/available', [CustomerCouponController::class, 'available']);
    Route::post('/coupons/apply', [CustomerCouponController::class, 'apply']);
});

// Delivery (rider) routes
Route::middleware(['auth:sanctum', 'delivery'])->prefix('delivery')->group(function () {
    // Dashboard
    Route::get('/dashboard', [DeliveryDashboardController::class, 'summary']);

    // Assigned orders
    Route::get('/assigned-orders', [AssignedOrdersController::class, 'index']);
    Route::patch('/assigned-orders/{deliveryAssignment}/status', [AssignedOrdersController::class, 'updateStatus']);
    Route::patch('/assigned-orders/{deliveryAssignment}/accept', [AssignedOrdersController::class, 'accept']);
    Route::patch('/assigned-orders/{deliveryAssignment}/reject', [AssignedOrdersController::class, 'reject']);
    Route::get('/assigned-orders/{deliveryAssignment}/invoice', [AssignedOrdersController::class, 'invoice']);

    // Finished delivery history
    Route::get('/history', [DeliveryHistoryController::class, 'index']);

    // Requests to the admin (day off)
    Route::get('/requests', [DeliveryRequestController::class, 'index']);
    Route::post('/requests', [DeliveryRequestController::class, 'store']);
    Route::delete('/requests/{deliveryRequest}', [DeliveryRequestController::class, 'destroy']);

    // Report a problem with an order
    Route::post('/issue-reports', [IssueReportController::class, 'store']);

    // Complaints
    Route::get('/complaints', [DeliveryComplaintController::class, 'index']);
    Route::post('/complaints', [DeliveryComplaintController::class, 'store']);
    Route::post('/complaints/{complaint}/respond', [DeliveryComplaintController::class, 'respond']);
    Route::delete('/complaints/{complaint}', [DeliveryComplaintController::class, 'destroy']);

    // Notification bell
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    // Profile, password and re-activation
    Route::put('/profile', [DeliveryProfileController::class, 'update']);
    Route::put('/password', [DeliveryProfileController::class, 'updatePassword']);
    Route::patch('/status/activate', [DeliveryProfileController::class, 'activate']);
});
