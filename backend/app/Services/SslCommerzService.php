<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// SSLCommerz payment gateway
class SslCommerzService
{
    // Start a payment session and return the payment page URL (null on failure)
    public function initiatePayment(Order $order, array $customer): ?string
    {
        // Our backend address, used for the callback URLs
        $backendUrl = rtrim(config('sslcommerz.backend_url'), '/');

        // Everything SSLCommerz needs to create the payment session
        $payload = [
            'store_id' => config('sslcommerz.store_id'),
            'store_passwd' => config('sslcommerz.store_password'),
            // Only the part not covered by the customer's refund balance.
            'total_amount' => $order->gatewayPayable(),
            'currency' => 'BDT',
            'tran_id' => $order->order_number,
            'success_url' => $backendUrl . '/api/payment/sslcommerz/success',
            'fail_url' => $backendUrl . '/api/payment/sslcommerz/fail',
            'cancel_url' => $backendUrl . '/api/payment/sslcommerz/cancel',
            'ipn_url' => $backendUrl . '/api/payment/sslcommerz/ipn',
            'shipping_method' => 'Courier',
            'product_name' => 'Grocery Order ' . $order->order_number,
            'product_category' => 'Grocery',
            'product_profile' => 'general',
            'cus_name' => $customer['name'],
            'cus_email' => $customer['email'] ?? 'customer@example.com',
            'cus_add1' => $customer['address'],
            'cus_city' => $customer['city'] ?? 'Dhaka',
            'cus_postcode' => $customer['postcode'] ?? '1200',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $customer['phone'],
            'ship_name' => $customer['name'],
            'ship_add1' => $customer['address'],
            'ship_city' => $customer['city'] ?? 'Dhaka',
            'ship_postcode' => $customer['postcode'] ?? '1200',
            'ship_country' => 'Bangladesh',
        ];

        // Send the request
        $response = Http::asForm()->post(config('sslcommerz.session_url'), $payload);

        // HTTP error
        if (! $response->successful()) {
            Log::error('SSLCommerz session init failed', ['response' => $response->body()]);
            return null;
        }

        // The gateway's JSON answer
        $data = $response->json();

        // The gateway refused to create the session
        if (($data['status'] ?? null) !== 'SUCCESS') {
            Log::error('SSLCommerz session init rejected', ['response' => $data]);
            return null;
        }

        return $data['GatewayPageURL'] ?? null;
    }

    // Ask SSLCommerz whether a payment (by val_id) is valid
    public function validatePayment(string $valId): ?array
    {
        $response = Http::get(config('sslcommerz.validation_url'), [
            'val_id' => $valId,
            'store_id' => config('sslcommerz.store_id'),
            'store_passwd' => config('sslcommerz.store_password'),
            'format' => 'json',
        ]);

        if (! $response->successful()) {
            Log::error('SSLCommerz validation request failed', ['response' => $response->body()]);
            return null;
        }

        return $response->json();
    }
    // Asks SSLCommerz to refund a settled transaction.
    public function initiateRefund(string $bankTransactionId, int $amount, string $remarks): ?array
    {
        // Call the refund API
        $response = Http::timeout(30)->get(config('sslcommerz.refund_url'), [
            'bank_tran_id' => $bankTransactionId,
            'refund_amount' => $amount,
            'refund_remarks' => $remarks,
            'store_id' => config('sslcommerz.store_id'),
            'store_passwd' => config('sslcommerz.store_password'),
            'v' => 1,
            'format' => 'json',
        ]);

        if (! $response->successful()) {
            // Never log the request payload — it carries the store password.
            Log::error('SSLCommerz refund request failed', [
                'bank_tran_id' => $bankTransactionId,
                'http_status' => $response->status(),
            ]);

            return null;
        }

        return $response->json();
    }

    // Re-reads the state of a refund SSLCommerz has already accepted
    // Call the refund status API
    public function refundStatus(string $refundRefId): ?array
    {
        $response = Http::timeout(30)->get(config('sslcommerz.refund_status_url'), [
            'refund_ref_id' => $refundRefId,
            'store_id' => config('sslcommerz.store_id'),
            'store_passwd' => config('sslcommerz.store_password'),
            'format' => 'json',
        ]);

        if (! $response->successful()) {
            Log::error('SSLCommerz refund status request failed', [
                'refund_ref_id' => $refundRefId,
                'http_status' => $response->status(),
            ]);

            return null;
        }

        return $response->json();
    }
}
