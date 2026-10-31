<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Order;
use App\Models\Refund;
use App\Models\RefundLog;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Notifications\SystemNotification;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

// Single source of truth for refunding a cancelled order.
class RefundService
{
    // Inject the gateway, wallet, notifier and notification services
    public function __construct(
        private SslCommerzService $sslCommerz,
        private WalletService $wallet,
        private RefundNotifier $notifier,
        private NotificationService $notifications,
    ) {
    }

    // What can actually be refunded on this order, and how.
    public function refundContext(Order $order): array
    {
        // Cash on delivery?
        $isCod = $order->payment_method === 'Cash on Delivery';

        // Amounts paid from the wallet and through the gateway
        $walletPaid = (int) $order->wallet_amount;
        $gatewayPaid = $this->gatewayPaidAmount($order);

        // Subtract what existing refunds already took
        $claimed = $this->claimedAmounts($order);
        $walletPortion = max(0, $walletPaid - $claimed['wallet_source']);
        $gatewayPortion = max(0, $gatewayPaid - $claimed['gateway_source']);

        // Total still refundable
        $refundable = $walletPortion + $gatewayPortion;

        // The gateway's refund API is keyed on bank_tran_id.
        $canUseGateway = $gatewayPortion > 0
            && $order->payment_gateway === 'SSLCOMMERZ'
            && filled($order->gateway_transaction_id);

        // Destinations the customer may choose
        $methods = [];

        if (! $isCod && $refundable > 0) {
            $methods[] = Refund::METHOD_WALLET;

            if ($canUseGateway) {
                $methods[] = Refund::METHOD_ORIGINAL_PAYMENT;
            }
        }

        // Cash the customer has not handed over yet
        $codUnpaid = $isCod && $this->codPaidAmount($order) === 0
            ? max(0, (int) $order->total_amount - $walletPaid)
            : 0;

        // Everything the cancellation screen needs
        return [
            'is_cod' => $isCod,
            'order_total' => (int) $order->total_amount,
            'refundable_amount' => $refundable,
            'wallet_portion' => $walletPortion,
            'gateway_portion' => $gatewayPortion,
            'cod_unpaid_amount' => $codUnpaid,
            'wallet_return_amount' => $this->walletReturnAmount($order),
            'methods' => $methods,
            'gateway_refund_available' => $canUseGateway,
            'payment_method' => $order->paymentMethodLabel(),
            'payment_gateway' => $order->payment_gateway,
            // The SSLCommerz channel the money originally came through.
            'payment_channel' => $order->paymentChannelName(),
            'original_transaction_id' => $order->transaction_id,
            'reason' => $this->ineligibilityReason($isCod, $refundable, $gatewayPaid, $walletPaid),
        ];
    }

    // Balance that comes back outside the refund pipeline if
    public function walletReturnAmount(Order $order): int
    {
        // Unpaid orders get their wallet share back directly
        $wasPaid = $order->payment_status === 'Paid' && $order->payment_method !== 'Cash on Delivery';

        return $wasPaid ? 0 : max(0, (int) $order->wallet_amount);
    }

    // Everything the database knows about how this order was really settled
    public function paymentBreakdown(Order $order): array
    {
        // Cash on delivery?
        $isCod = $order->payment_method === 'Cash on Delivery';

        // How much came from each payment source
        $walletPaid = $this->walletPaidAmount($order);
        $onlinePaid = $this->gatewayPaidAmount($order);
        $codPaid = $this->codPaidAmount($order);

        // Cash still at the customer's door.
        $codUnpaid = $isCod && $codPaid === 0
            ? max(0, (int) $order->total_amount - (int) $order->wallet_amount)
            : 0;

        // What is still refundable, and all refunds so far
        $remaining = $this->remainingBuckets($order);
        $refunds = $order->refunds()->get();

        return [
            'order_total' => (int) $order->total_amount,
            'wallet_paid_amount' => $walletPaid,
            'online_paid_amount' => $onlinePaid,
            'cod_paid_amount' => $codPaid,
            'cod_unpaid_amount' => $codUnpaid,
            'actual_paid_amount' => $walletPaid + $onlinePaid + $codPaid,
            // Balance handed back because the order was never paid for.
            'wallet_returned_amount' => $this->walletReturnedAmount($order),
            'refunded_amount' => (int) $refunds->where('status', Refund::STATUS_COMPLETED)->sum('amount'),
            'refund_in_progress_amount' => (int) $refunds->whereIn('status', Refund::OPEN_STATUSES)->sum('amount'),
            'remaining_refundable' => $remaining,
            'refundable_amount' => array_sum($remaining),
            'payment_method' => $order->paymentMethodLabel(),
            'payment_gateway' => $order->payment_gateway,
            // The SSLCommerz channel the money originally came through.
            'payment_channel' => $order->paymentChannelName(),
            'payment_status' => $order->payment_status,
            'original_transaction_id' => $order->transaction_id,
            'gateway_transaction_id' => $order->gateway_transaction_id,
            // Whether the gateway refund API can actually be used
            'gateway_reference_available' => $order->payment_gateway === 'SSLCOMMERZ'
                && filled($order->gateway_transaction_id),
            'is_cod' => $isCod,
        ];
    }

    // True when cancelling this order should hand the customer a refund choice.
    public function isRefundable(Order $order): bool
    {
        $context = $this->refundContext($order);

        return ! $context['is_cod'] && $context['refundable_amount'] > 0;
    }

    // --------------------------- post-delivery ---------------------------

    // What can be refunded for a return the customer has already taken delivery of
    public function returnRefundContext(ReturnRequest $returnRequest): array
    {
        // The order this return belongs to
        $order = $returnRequest->order;

        if (! $order) {
            return $this->emptyReturnContext('This request is no longer attached to an order.');
        }

        // The refundable total is the request's own amount
        $eligible = (int) $returnRequest->amount
            + ($this->shippingRefundable() ? (int) $returnRequest->shipping_fee : 0);

        // What is still refundable in each pot
        $remaining = $this->remainingBuckets($order);

        // Refund & Cancellation Policy
        $deliveryCharge = $this->deliveryChargeDeduction($returnRequest);
        $capacity = max(0, array_sum($remaining) - $deliveryCharge);
        $refundable = max(0, min($eligible, $capacity));

        // The gateway can only be used with a gateway reference
        $canUseGateway = $remaining['gateway_source'] > 0
            && $order->payment_gateway === 'SSLCOMMERZ'
            && filled($order->gateway_transaction_id);

        $methods = [];

        if ($refundable > 0) {
            // The balance is always a valid destination
            $methods[] = Refund::METHOD_WALLET;

            if ($canUseGateway) {
                $methods[] = Refund::METHOD_ORIGINAL_PAYMENT;
            }
        }

        return [
            'eligible_amount' => $eligible,
            'refundable_amount' => $refundable,
            'remaining' => $remaining,
            'methods' => $methods,
            'gateway_refund_available' => $canUseGateway,
            'preferred_method' => $returnRequest->preferred_refund_method,
            'payment_method' => $order->paymentMethodLabel(),
            'payment_gateway' => $order->payment_gateway,
            // The SSLCommerz channel the money originally came through.
            'payment_channel' => $order->paymentChannelName(),
            'is_cod' => $order->payment_method === 'Cash on Delivery',
            'delivery_charge' => $deliveryCharge,
            'reason' => $refundable > 0 ? null : $this->returnIneligibilityReason($order, $capacity),
        ];
    }

    // The delivery charge a post-delivery refund keeps back
    public function deliveryChargeDeduction(ReturnRequest $returnRequest): int
    {
        $order = $returnRequest->order;

        if (! $order || $returnRequest->type !== 'Return') {
            return 0;
        }

        return (int) $order->delivery_fee;
    }

    // Raises the refund an admin has agreed to for a delivered order
    public function openReturnRefund(ReturnRequest $returnRequest, ?string $method, ?User $actor, string $role, ?string $reason = null): Collection
    {
        // What can be refunded and where
        $context = $this->returnRefundContext($returnRequest);

        // Nothing left to refund
        if ($context['refundable_amount'] <= 0) {
            throw new RuntimeException($context['reason'] ?? 'There is nothing left to refund on this order.');
        }

        // Use the customer's preferred method if none was chosen
        $method ??= $returnRequest->preferred_refund_method;

        if ($method !== null && ! in_array($method, $context['methods'], true)) {
            // A preference that can't be honoured
            if ($returnRequest->preferred_refund_method === $method) {
                $method = Refund::METHOD_WALLET;
            } else {
                throw new RuntimeException('That refund method is not available for this order.');
            }
        }

        // Default to the wallet; default reason from the request
        $method ??= Refund::METHOD_WALLET;
        $reason ??= $returnRequest->reason ?: 'Approved return — refund issued.';
        $created = collect();

        // Create the refunds inside one transaction
        DB::transaction(function () use ($returnRequest, $context, $method, $actor, $role, $reason, &$created) {
            // Lock the order row
            $order = Order::whereKey($returnRequest->order_id)->lockForUpdate()->first();

            if (! $order) {
                throw new RuntimeException('Order not found.');
            }

            // Re-read the buckets under the lock
            $allocations = $this->allocate($this->remainingBuckets($order), $context['refundable_amount'], $method);

            // Create one refund per pot the money comes from
            foreach ($allocations as $allocation) {
                $refund = $this->createRefund(
                    $order,
                    $allocation['method'],
                    $allocation['amount'],
                    $allocation['bucket'],
                    $actor,
                    $role,
                    $reason,
                    $returnRequest,
                );

                if ($refund) {
                    $created->push($refund);
                }
            }

            // Nothing new was created
            if ($created->isEmpty()) {
                throw new RuntimeException('A refund has already been raised for this request.');
            }

            // Keeps the policy deduction on the audit trail
            if ($context['delivery_charge'] > 0) {
                foreach ($created as $refund) {
                    $this->log(
                        $refund,
                        'delivery_charge.deducted',
                        "Refund after delivery: the {$context['delivery_charge']}TK delivery charge is not refundable.",
                        ['delivery_charge' => $context['delivery_charge']],
                    );
                }
            }

            // Mark the return request as refunded and waiting for approval
            $returnRequest->forceFill([
                'resolution' => 'Refund',
                'refund_method' => $method,
                'refund_status' => 'Pending Approval',
                'refund_initiated_at' => $returnRequest->refund_initiated_at ?? now(),
            ])->save();
        });

        // Money going back to the BazarGhat balance never leaves BazarGhat
        $settlesNow = fn (Refund $refund) => $actor !== null && $refund->refund_method === Refund::METHOD_WALLET;

        foreach ($created as $refund) {
            // A balance refund credited below is announced as approved and completed
            if (! $settlesNow($refund)) {
                $this->notifier->notify($refund->fresh(['order', 'customer']), 'submitted');
            }
        }

        $created = $created->map(fn (Refund $refund) => $settlesNow($refund)
            ? $this->approveRefund($refund->fresh(), $actor)
            : $refund);

        return $created;
    }

    // The admin says yes.
    public function approveRefund(Refund $refund, User $admin, ?string $method = null): Refund
    {
        // The approval is claimed under a row lock before any money moves.
        $claimed = DB::transaction(function () use ($refund, $admin, $method) {
            // Lock the refund row
            $locked = Refund::whereKey($refund->id)->lockForUpdate()->first();

            // Only a pending refund that is not yet approved
            if (! $locked || $locked->status !== Refund::STATUS_PENDING || $locked->approved_at !== null) {
                return null;
            }

            // The admin may redirect the money to the other destination
            if ($method !== null && $method !== $locked->refund_method) {
                $this->switchMethod($locked, $method);
            }

            // Record who approved it and when
            $locked->forceFill([
                'approved_by' => $admin->id,
                'approved_at' => now(),
            ])->save();

            return $locked;
        });

        // Someone else already handled it
        if (! $claimed) {
            throw new RuntimeException('Only a refund that is still awaiting approval can be approved.');
        }

        $refund = $claimed;

        // Log and notify the approval
        $this->log($refund, 'approved', "Refund approved by {$admin->name}.", [
            'admin_id' => $admin->id,
            'method' => $refund->refund_method,
        ]);

        $this->notifier->notify($refund->fresh(['order', 'customer']), 'approved');

        // Wallet refunds are paid at once
        if ($refund->refund_method === Refund::METHOD_WALLET) {
            return $this->settleToWallet($refund);
        }

        // Same rule as a cancellation
        DB::afterCommit(function () use ($refund) {
            try {
                $this->sendToGateway($refund->fresh());
            } catch (\Throwable $e) {
                report($e);
            }
        });

        return $refund->fresh();
    }

    // The admin says no.
    public function rejectRefund(Refund $refund, User $admin, string $reason): Refund
    {
        // Claimed the same way as an approval
        $claimed = DB::transaction(function () use ($refund, $reason) {
            // Lock the refund row
            $locked = Refund::whereKey($refund->id)->lockForUpdate()->first();

            // Only a pending refund with no decision yet
            if (! $locked || $locked->status !== Refund::STATUS_PENDING
                || $locked->approved_at !== null || $locked->rejected_at !== null) {
                return null;
            }

            // Record the rejection
            $locked->forceFill([
                'rejected_at' => now(),
                'rejection_reason' => $reason,
            ])->save();

            return $locked;
        });

        // Someone else already handled it
        if (! $claimed) {
            throw new RuntimeException('Only a refund that is still awaiting approval can be rejected.');
        }

        $refund = $claimed;

        // Log it and mark the refund rejected
        $this->log($refund, 'rejected', "Refund rejected by {$admin->name}.", [
            'admin_id' => $admin->id,
            'reason' => $reason,
        ]);

        return $this->transition($refund, Refund::STATUS_REJECTED, 'Refund request rejected by the admin.');
    }

    // Mirrors the refunds back onto the return request the
    public function syncReturnRequestState(?ReturnRequest $returnRequest): void
    {
        if (! $returnRequest) {
            return;
        }

        // All refunds on the request
        $refunds = $returnRequest->refunds()->get();

        if ($refunds->isEmpty()) {
            return;
        }

        // Work out the overall refund state from all refunds
        $awaiting = $refunds->filter(fn (Refund $refund) => $refund->awaitsApproval())->isNotEmpty();
        $open = $refunds->whereIn('status', Refund::OPEN_STATUSES)->isNotEmpty();
        $failed = $refunds->where('status', Refund::STATUS_FAILED)->isNotEmpty();
        $allRejected = $refunds->every(fn (Refund $refund) => $refund->status === Refund::STATUS_REJECTED);
        $allCompleted = $refunds->every(fn (Refund $refund) => $refund->status === Refund::STATUS_COMPLETED);

        // Status shown on the return request
        $attributes = [
            'refund_status' => match (true) {
                $allRejected => 'Rejected',
                $awaiting => 'Pending Approval',
                $failed => 'Failed',
                $open => 'Processing',
                $allCompleted => 'Refunded',
                default => 'Processing',
            },
            'refund_processing_at' => $refunds->min('processed_at') ?? $returnRequest->refund_processing_at,
            'refund_completed_at' => $allCompleted ? $refunds->max('completed_at') : null,
        ];

        if ($allRejected) {
            // Every refund refused
            $attributes['resolution'] = null;
            $attributes['refund_method'] = null;
        } elseif ($allCompleted) {
            $attributes['status'] = 'Completed';
        }

        $returnRequest->forceFill($attributes)->save();
    }


    // Splits an amount across the pots it can be drawn from
    private function allocate(array $remaining, int $amount, string $method): array
    {
        // Gateway refunds drain the gateway leg first
        $order = $method === Refund::METHOD_ORIGINAL_PAYMENT
            ? ['gateway_source', 'wallet_source', 'cod_source']
            : ['wallet_source', 'cod_source', 'gateway_source'];

        // Order in which pots are used
        $allocations = [];
        $left = $amount;

        // Take as much as possible from each pot until the amount is covered
        foreach ($order as $bucket) {
            if ($left <= 0) {
                break;
            }

            $take = min($left, (int) ($remaining[$bucket] ?? 0));

            if ($take <= 0) {
                continue;
            }

            $allocations[] = [
                'bucket' => $bucket,
                'amount' => $take,
                'method' => $bucket === 'gateway_source' ? $method : Refund::METHOD_WALLET,
            ];

            $left -= $take;
        }

        return $allocations;
    }

    // What is left in each pot after existing refunds have taken their share.
    private function remainingBuckets(Order $order): array
    {
        // Amounts already claimed by earlier refunds
        $claimed = $this->claimedAmounts($order);

        return [
            'wallet_source' => max(0, (int) $order->wallet_amount - $claimed['wallet_source']),
            'gateway_source' => max(0, $this->gatewayPaidAmount($order) - $claimed['gateway_source']),
            'cod_source' => max(0, $this->codPaidAmount($order) - $claimed['cod_source']),
        ];
    }

    // Moves a pending refund to the other destination
    private function switchMethod(Refund $refund, string $method): void
    {
        // Only the two known methods are allowed
        if (! in_array($method, [Refund::METHOD_WALLET, Refund::METHOD_ORIGINAL_PAYMENT], true)) {
            throw new RuntimeException('That is not a valid refund method.');
        }

        // Only gateway money can go back to the gateway
        if ($this->bucketOf($refund) !== 'gateway_source' && $method === Refund::METHOD_ORIGINAL_PAYMENT) {
            throw new RuntimeException('This part of the payment did not come through the payment gateway, so it can only be returned to the account balance.');
        }

        // A gateway refund needs the gateway transaction id
        if ($method === Refund::METHOD_ORIGINAL_PAYMENT && blank($refund->gateway_transaction_id)) {
            throw new RuntimeException('The original payment has no gateway reference, so it can only be refunded to the account balance.');
        }

        // Save the new destination and log the change
        $from = $refund->refund_method;

        $refund->forceFill([
            'refund_method' => $method,
            'payment_gateway' => $method === Refund::METHOD_WALLET ? 'BAZARGHAT_WALLET' : $refund->order?->payment_gateway,
        ])->save();

        $this->log($refund, 'method.changed', "Refund destination changed from {$from} to {$method}.");
    }

    // Whether the shipping fee is included in a refund
    private function shippingRefundable(): bool
    {
        return (bool) (AppSetting::group('refund_settings', ['shipping_refundable' => true])['shipping_refundable'] ?? true);
    }

    // Message explaining why nothing can be refunded
    private function returnIneligibilityReason(Order $order, int $capacity): string
    {
        if ($capacity <= 0 && $this->totalPaidAmount($order) <= 0) {
            return 'Nothing has been paid for this order, so there is nothing to refund.';
        }

        return 'The full amount paid for this order has already been refunded.';
    }

    // Empty context used when the request has no order
    private function emptyReturnContext(string $reason): array
    {
        return [
            'eligible_amount' => 0,
            'refundable_amount' => 0,
            'remaining' => ['wallet_source' => 0, 'gateway_source' => 0, 'cod_source' => 0],
            'methods' => [],
            'gateway_refund_available' => false,
            'preferred_method' => null,
            'payment_method' => null,
            'payment_gateway' => null,
            'is_cod' => false,
            'delivery_charge' => 0,
            'reason' => $reason,
        ];
    }

    // Creates and starts the refunds for an order that has just been cancelled.
    public function processCancellationRefund(Order $order, ?string $method, ?User $actor, string $role, ?string $reason = null): Collection
    {
        // What can be refunded and where
        $context = $this->refundContext($order);

        // Nothing to refund for cash on delivery or when nothing is left
        if ($context['is_cod'] || $context['refundable_amount'] <= 0) {
            return collect();
        }

        // Refuse a method that is not available
        if ($method !== null && ! in_array($method, $context['methods'], true)) {
            throw new RuntimeException('That refund method is not available for this order.');
        }

        // Re-read under lock so two cancel requests racing on
        $locked = Order::whereKey($order->id)->lockForUpdate()->first();

        if (! $locked) {
            throw new RuntimeException('Order not found.');
        }

        // Default to the original payment when possible, else the wallet
        $method ??= $context['gateway_refund_available']
            ? Refund::METHOD_ORIGINAL_PAYMENT
            : Refund::METHOD_WALLET;

        $reason ??= 'Order cancelled before delivery.';
        $created = collect();

        // Money spent from the refund balance can only travel back to the refund balance
        if ($context['wallet_portion'] > 0) {
            $refund = $this->createRefund($locked, Refund::METHOD_WALLET, $context['wallet_portion'], 'wallet_source', $actor, $role, $reason);

            if ($refund) {
                $created->push($refund);
            }
        }

        if ($context['gateway_portion'] > 0) {
            $refund = $this->createRefund($locked, $method, $context['gateway_portion'], 'gateway_source', $actor, $role, $reason);

            if ($refund) {
                $created->push($refund);
            }
        }

        // Tell the customer the refund exists before anything is attempted
        foreach ($created as $refund) {
            $this->notifier->notify($refund->fresh(['order', 'customer']), 'requested');
        }

        // Wallet refunds are paid at once
        foreach ($created as $refund) {
            if ($refund->refund_method === Refund::METHOD_WALLET) {
                $this->settleToWallet($refund);
            }
        }

        // Gateway refunds still to send
        $gatewayRefunds = $created->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->values();

        if ($gatewayRefunds->isNotEmpty()) {
            // Deferred until the cancellation commits
            DB::afterCommit(function () use ($gatewayRefunds) {
                foreach ($gatewayRefunds as $refund) {
                    try {
                        $this->sendToGateway($refund->fresh());
                    } catch (\Throwable $e) {
                        report($e);
                    }
                }
            });
        }

        // Update the order's payment status
        $this->syncOrderPaymentState($locked->fresh());

        return $created;
    }

    // Re-reads a PROCESSING gateway refund from SSLCommerz and settles
    public function syncStatus(Refund $refund): Refund
    {
        // Only gateway refunds need syncing
        if ($refund->refund_method !== Refund::METHOD_ORIGINAL_PAYMENT) {
            return $refund;
        }

        // Only open refunds
        if (! in_array($refund->status, Refund::OPEN_STATUSES, true)) {
            return $refund;
        }

        // Nothing has been sent for a refund still waiting on an admin
        if ($refund->awaitsApproval()) {
            return $refund;
        }

        // Queued but never accepted by the gateway
        if (blank($refund->sslcommerz_refund_id)) {
            return $this->sendToGateway($refund);
        }

        // Ask SSLCommerz for the refund status and note when we checked
        $response = $this->sslCommerz->refundStatus($refund->sslcommerz_refund_id);
        $refund->forceFill(['last_checked_at' => now()])->save();

        // No answer: try again later
        if ($response === null) {
            $this->log($refund, 'gateway.status_unreachable', 'Could not reach SSLCommerz to verify the refund. Will retry.');

            return $refund;
        }

        // Status text from the gateway
        $status = strtolower((string) ($response['status'] ?? ''));

        $this->log($refund, 'gateway.status_checked', "SSLCommerz reported \"{$status}\".", $this->scrub($response));

        // Move the refund to the matching status
        return match ($status) {
            'refunded' => $this->transition($refund, Refund::STATUS_COMPLETED, 'SSLCommerz confirmed the refund was processed.'),
            'cancelled', 'failed' => $this->transition(
                $refund,
                Refund::STATUS_FAILED,
                'SSLCommerz reported the refund as cancelled.',
                (string) ($response['errorReason'] ?? 'The payment gateway cancelled this refund.')
            ),
            default => $this->transition($refund, Refund::STATUS_PROCESSING, 'Refund is still being processed by SSLCommerz.'),
        };
    }

    // Submits a refund to SSLCommerz.
    public function sendToGateway(Refund $refund): Refund
    {
        // Only open gateway refunds
        if ($refund->refund_method !== Refund::METHOD_ORIGINAL_PAYMENT
            || ! in_array($refund->status, Refund::OPEN_STATUSES, true)) {
            return $refund;
        }

        // A post-delivery refund nobody has approved must never reach the gateway
        if ($refund->awaitsApproval()) {
            return $refund;
        }

        // SSLCommerz has already accepted this one
        if (filled($refund->sslcommerz_refund_id)) {
            return $this->syncStatus($refund);
        }

        // The payment is real and the money is owed
        if (blank($refund->gateway_transaction_id)) {
            return $this->fallbackToWallet($refund, Refund::FALLBACK_MISSING_GATEWAY_REFERENCE);
        }

        $this->log($refund, 'gateway.submitting', "Requesting a {$refund->amount}TK refund from SSLCommerz.");

        // Ask SSLCommerz to start the refund
        $response = $this->sslCommerz->initiateRefund(
            $refund->gateway_transaction_id,
            $refund->amount,
            'Refund for cancelled order ' . ($refund->order?->order_number ?? $refund->refund_number),
        );

        $refund->forceFill(['last_checked_at' => now()])->save();

        if ($response === null) {
            // The request never got an answer.
            $this->log($refund, 'gateway.unreachable', 'SSLCommerz could not be reached. The refund stays queued for retry.');

            return $refund;
        }

        // Status and refund reference from the gateway
        $status = strtolower((string) ($response['status'] ?? ''));
        $refundRef = $response['refund_ref_id'] ?? null;

        $this->log($refund, 'gateway.submitted', "SSLCommerz answered \"{$status}\".", $this->scrub($response));

        // Did the gateway refuse the request?
        $rejected = in_array($status, ['failed', 'invalid_request', 'inactive'], true)
            || in_array($response['APIConnect'] ?? null, ['INVALID_REQUEST', 'FAILED', 'INACTIVE'], true);

        if ($rejected) {
            return $this->transition(
                $refund,
                Refund::STATUS_FAILED,
                'SSLCommerz rejected the refund request.',
                (string) ($response['errorReason'] ?? 'The payment gateway rejected this refund request.')
            );
        }

        // Save the gateway's refund reference
        if ($refundRef) {
            $refund->forceFill(['sslcommerz_refund_id' => $refundRef])->save();
        }

        // Accepted — the money has not moved yet.
        $refund = $this->transition($refund, Refund::STATUS_PROCESSING, 'Refund request accepted by SSLCommerz.');

        return $refundRef ? $this->syncStatus($refund->fresh()) : $refund;
    }


    // Creates one refund row
    private function createRefund(
        Order $order,
        string $method,
        int $amount,
        string $bucket,
        ?User $actor,
        string $role,
        string $reason,
        ?ReturnRequest $returnRequest = null,
    ): ?Refund {
        // Cancellations are keyed on the order (one refund per source bucket per order)
        $base = $returnRequest
            ? "return:{$returnRequest->id}:{$bucket}"
            : "order:{$order->id}:{$bucket}";

        // Next free key for this refund (null means one already exists)
        $key = $this->nextKey($base);

        if ($key === null) {
            Log::info('Duplicate refund suppressed', ['order_id' => $order->id, 'key' => $base]);

            return null;
        }

        // Does the money come from the gateway pot?
        $fromGateway = $bucket === 'gateway_source';

        // Gateway money coming back as balance is only a
        $isFallback = $fromGateway
            && $method === Refund::METHOD_WALLET
            && $order->payment_gateway === 'SSLCOMMERZ'
            && blank($order->gateway_transaction_id);

        // Create the refund row
        try {
            $refund = Refund::create([
                'refund_number' => 'RFD-TMP-' . uniqid(),
                'order_id' => $order->id,
                'return_request_id' => $returnRequest?->id,
                'customer_id' => $order->user_id,
                'amount' => $amount,
                'refund_method' => $method,
                'is_manual_fallback' => $isFallback,
                'fallback_reason' => $isFallback ? Refund::FALLBACK_MISSING_GATEWAY_REFERENCE : null,
                'source' => $returnRequest ? Refund::SOURCE_POST_DELIVERY : Refund::SOURCE_CANCELLATION,
                'payment_method' => $order->paymentMethodLabel(),
                'payment_gateway' => $fromGateway ? $order->payment_gateway : 'BAZARGHAT_WALLET',
                'original_transaction_id' => $fromGateway ? $order->transaction_id : null,
                'gateway_transaction_id' => $fromGateway ? $order->gateway_transaction_id : null,
                'status' => Refund::STATUS_PENDING,
                'reason' => $reason,
                'idempotency_key' => $key,
                'requested_by' => $actor?->id,
                'requested_by_role' => $role,
            ]);
        // The unique key stopped a duplicate refund
        } catch (QueryException $e) {
            if ($this->isDuplicate($e)) {
                Log::info('Duplicate refund suppressed', ['order_id' => $order->id, 'key' => $key]);

                return null;
            }

            throw $e;
        }

        // Replace the temporary number with RFD-YEAR-00001
        $refund->forceFill([
            'refund_number' => 'RFD-' . now()->format('Y') . '-' . str_pad((string) $refund->id, 5, '0', STR_PAD_LEFT),
        ])->save();

        // Log the creation
        $this->log($refund, 'created', "Refund of {$amount}TK created for order {$order->order_number}.", [
            'method' => $method,
            'source' => $bucket,
            'manual_fallback' => $isFallback,
        ]);

        if ($isFallback) {
            $this->log(
                $refund,
                'fallback.flagged',
                'The original payment has no gateway transaction reference, so this refund is returning to the account balance.',
                ['fallback_reason' => Refund::FALLBACK_MISSING_GATEWAY_REFERENCE],
            );
        }

        return $refund;
    }

    // The key this refund should be written under
    private function nextKey(string $base): ?string
    {
        // All refunds that used this key before
        $existing = Refund::where('idempotency_key', 'like', $base . '%')->get();

        if ($existing->isEmpty()) {
            return $base;
        }

        // Live refunds block a new one; failed/rejected ones allow a retry key
        $live = $existing->whereNotIn('status', [Refund::STATUS_FAILED, Refund::STATUS_REJECTED]);

        return $live->isNotEmpty() ? null : $base . ':r' . ($existing->count() + 1);
    }

    // Redirects a refund that cannot travel its intended route
    private function fallbackToWallet(Refund $refund, string $reason): Refund
    {
        // Only open refunds
        if (! in_array($refund->status, Refund::OPEN_STATUSES, true)) {
            return $refund;
        }

        // Switch the refund to the wallet and flag it as a fallback
        $refund->forceFill([
            'refund_method' => Refund::METHOD_WALLET,
            'payment_gateway' => 'BAZARGHAT_WALLET',
            'is_manual_fallback' => true,
            'fallback_reason' => $reason,
        ])->save();

        $this->log($refund, 'fallback.wallet', "Refunding to the account balance instead: {$reason}.", [
            'intended_method' => Refund::METHOD_ORIGINAL_PAYMENT,
            'fallback_reason' => $reason,
        ]);

        return $this->settleToWallet($refund);
    }

    // Credits a wallet refund and completes it
    private function settleToWallet(Refund $refund): Refund
    {
        // The customer whose wallet is credited
        $customer = $refund->customer;

        if (! $customer) {
            return $this->transition($refund, Refund::STATUS_FAILED, 'No customer account is attached to this order.', 'This order has no customer account to credit.');
        }

        // Mark as processing
        $refund = $this->transition($refund, Refund::STATUS_PROCESSING, 'Crediting the BazarGhat refund balance.');

        // Add the money to the wallet (does nothing if already credited)
        $entry = $this->wallet->credit(
            $customer,
            $refund->amount,
            WalletTransaction::REF_REFUND,
            $refund->id,
            'Refund for order ' . ($refund->order?->order_number ?? $refund->refund_number),
        );

        $this->log($refund, 'wallet.credited', $entry
            ? "Credited {$refund->amount}TK to the refund balance."
            : 'Credit was already applied — no second credit was made.');

        // Only on the call that actually moved the money.
        if ($entry) {
            $amount = '৳' . number_format($refund->amount);
            $order = $refund->order?->order_number ?? $refund->refund_number;

            $this->notifications->send(
                $customer,
                NotificationService::WALLET_CREDITED,
                'Balance credited',
                "{$amount} has been credited to your account balance for order {$order}.",
                NotificationService::REF_WALLET,
                $refund->id,
                SystemNotification::PRIORITY_SUCCESS,
            );
        }

        return $this->transition($refund, Refund::STATUS_COMPLETED, 'Refund balance credited and available to use.');
    }

    // Moves a refund to a new status, writing the audit trail and the mirrors.
    private function transition(Refund $refund, string $to, string $message, ?string $failureReason = null): Refund
    {
        // Current status
        $from = $refund->status;

        // Nothing changed
        if ($from === $to && $failureReason === null) {
            return $refund;
        }

        // Status plus the timestamps that go with it
        $attributes = ['status' => $to];

        if ($to === Refund::STATUS_PROCESSING && ! $refund->processed_at) {
            $attributes['processed_at'] = now();
        }

        if ($to === Refund::STATUS_COMPLETED) {
            $attributes['processed_at'] = $refund->processed_at ?? now();
            $attributes['completed_at'] = now();
        }

        if ($to === Refund::STATUS_FAILED) {
            $attributes['failure_reason'] = $failureReason;
        }

        // Save the new status
        $refund->forceFill($attributes)->save();

        // Log the change
        RefundLog::create([
            'refund_id' => $refund->id,
            'event' => 'status.' . strtolower($to),
            'from_status' => $from,
            'to_status' => $to,
            'message' => $message,
        ]);

        // Update the order's payment status
        if ($refund->order) {
            $this->syncOrderPaymentState($refund->order->fresh());
        }

        // Update the linked return request
        if ($refund->return_request_id) {
            $this->syncReturnRequestState($refund->returnRequest()->first());
        }

        // Tell the customer
        $this->announce($refund, $to);

        return $refund;
    }

    // Texts and notifies the customer about a status the customer actually cares about
    private function announce(Refund $refund, string $status): void
    {
        // Which customer message goes with the new status
        $event = match ($status) {
            Refund::STATUS_PROCESSING => $refund->refund_method === Refund::METHOD_ORIGINAL_PAYMENT ? 'processing' : null,
            Refund::STATUS_COMPLETED => 'completed',
            Refund::STATUS_FAILED => 'failed',
            Refund::STATUS_REJECTED => 'rejected',
            default => null,
        };

        if ($event !== null) {
            $this->notifier->notify($refund->fresh(['order', 'customer']) ?? $refund, $event);
        }
    }

    // Add an entry to the refund's audit trail
    private function log(Refund $refund, string $event, string $message, array $context = []): void
    {
        RefundLog::create([
            'refund_id' => $refund->id,
            'event' => $event,
            'from_status' => $refund->status,
            'to_status' => $refund->status,
            'message' => $message,
            'context' => $context ?: null,
        ]);
    }

    // Keeps the order's payment_status and the mirrored Return &
    public function syncOrderPaymentState(Order $order): void
    {
        // All refunds on the order
        $refunds = $order->refunds()->get();

        if ($refunds->isEmpty()) {
            return;
        }

        // A post-delivery refund nobody has approved yet is not money in motion
        $live = $refunds->reject(fn (Refund $refund) => $refund->awaitsApproval());

        if ($live->isEmpty()) {
            $this->mirrorToReturnRequest($order, $refunds);

            return;
        }

        // Summary of the live refunds
        $anyOpen = $live->whereIn('status', Refund::OPEN_STATUSES)->isNotEmpty();
        $anyFailed = $live->where('status', Refund::STATUS_FAILED)->isNotEmpty();
        $completed = (int) $live->where('status', Refund::STATUS_COMPLETED)->sum('amount');

        // What the customer actually handed over for this order.
        $paid = $this->totalPaidAmount($order);

        // Pick the order's payment status from the refunds
        $paymentStatus = match (true) {
            // Still open, or failed and therefore still owed: outstanding either way.
            $anyOpen, $anyFailed => 'Refund Pending',
            $completed > 0 && $completed >= $paid => 'Refunded',
            // Everything settled, but only part of the order came
            $paid > 0 => 'Paid',
            default => null,
        };

        // Save it only when it changed
        if ($paymentStatus !== null && $order->payment_status !== $paymentStatus) {
            $order->forceFill(['payment_status' => $paymentStatus])->save();
        }

        $this->mirrorToReturnRequest($order, $refunds);
    }

    // Everything the customer paid for this order, however it arrived.
    private function totalPaidAmount(Order $order): int
    {
        return (int) $order->wallet_amount
            + $this->gatewayPaidAmount($order)
            + $this->codPaidAmount($order);
    }

    // Balance actually spent on this order, for reporting.
    private function walletPaidAmount(Order $order): int
    {
        // Wallet debit recorded for this order
        $debited = (int) WalletTransaction::where('customer_id', $order->user_id)
            ->where('type', WalletTransaction::TYPE_DEBIT)
            ->where('reference_type', WalletTransaction::REF_ORDER)
            ->where('reference_id', $order->id)
            ->value('amount');

        return $debited ?: max(0, (int) $order->wallet_amount);
    }

    // Balance already returned to the customer for this order
    private function walletReturnedAmount(Order $order): int
    {
        return (int) WalletTransaction::where('customer_id', $order->user_id)
            ->where('type', WalletTransaction::TYPE_CREDIT)
            ->where('reference_type', WalletTransaction::REF_ORDER)
            ->where('reference_id', $order->id)
            ->value('amount');
    }

    // Cash a rider actually collected.
    private function codPaidAmount(Order $order): int
    {
        // Only cash on delivery
        if ($order->payment_method !== 'Cash on Delivery') {
            return 0;
        }

        // Only once the cash has been collected
        if (! in_array($order->payment_status, ['Paid', 'Refund Pending', 'Refunded'], true)) {
            return 0;
        }

        return max(0, (int) $order->total_amount - (int) $order->wallet_amount);
    }

    // The Return & Refund admin screen reads the `returns` table
    private function mirrorToReturnRequest(Order $order, Collection $refunds): void
    {
        // Post-delivery refunds already belong to a return request of their own
        $refunds = $refunds->where('source', Refund::SOURCE_CANCELLATION)->values();

        if ($refunds->isEmpty()) {
            return;
        }

        // Overall state of the cancellation refunds
        $anyOpen = $refunds->whereIn('status', Refund::OPEN_STATUSES)->isNotEmpty();
        $allFailed = $refunds->every(fn ($refund) => $refund->status === Refund::STATUS_FAILED);
        $total = (int) $refunds->where('status', '!=', Refund::STATUS_FAILED)->sum('amount');
        $primary = $refunds->sortByDesc('amount')->first();

        // Values shown on the return request row
        $attributes = [
            'amount' => $total,
            'payment_method' => $primary?->methodLabel() ?? $order->paymentMethodLabel(),
            'status' => $allFailed ? 'Pending' : ($anyOpen ? 'In Review' : 'Completed'),
            'resolution' => 'Refund',
            'refund_status' => match (true) {
                $allFailed => 'Failed',
                $anyOpen => 'Processing',
                default => 'Refunded',
            },
            'refund_initiated_at' => $refunds->min('created_at') ?? now(),
            'refund_processing_at' => $refunds->min('processed_at'),
            'refund_completed_at' => $anyOpen || $allFailed ? null : $refunds->max('completed_at'),
        ];

        // Update the existing refund request if there is one
        $existing = ReturnRequest::where('order_id', $order->id)
            ->where('type', 'Refund')
            ->where('status', '!=', 'Rejected')
            ->latest('id')
            ->first();

        if ($existing) {
            $existing->update($attributes);

            return;
        }

        // Otherwise create a system refund request for it
        $record = ReturnRequest::create(array_merge($attributes, [
            'request_number' => 'RET-TMP-' . uniqid(),
            'order_id' => $order->id,
            'order_item_id' => null,
            'customer_id' => $order->user_id,
            'type' => 'Refund',
            'source' => 'System Cancellation',
            'product_name' => "Order {$order->order_number}",
            'quantity' => 1,
            'price' => $order->total_amount,
            'reason' => 'Order cancelled before delivery — refund issued.',
            'shipping_fee' => 0,
        ]));

        // Replace the temporary number with RET-YEAR-0001
        $record->update([
            'request_number' => 'RET-' . now()->format('Y') . '-' . str_pad((string) $record->id, 4, '0', STR_PAD_LEFT),
        ]);
    }

    // What SSLCommerz actually captured for this order.
    private function gatewayPaidAmount(Order $order): int
    {
        // Cash on delivery never went through the gateway
        if ($order->payment_method === 'Cash on Delivery') {
            return 0;
        }

        // Only paid orders
        if (! in_array($order->payment_status, ['Paid', 'Refund Pending', 'Refunded'], true)) {
            return 0;
        }

        // Use the recorded paid amount when it exists
        if ((int) $order->paid_amount > 0) {
            return (int) $order->paid_amount;
        }

        // A replacement is "Paid" by inheritance, not by payment.
        if ($order->is_replacement) {
            return 0;
        }

        return max(0, (int) $order->total_amount - (int) $order->wallet_amount);
    }

    // Amounts already spoken for by existing refunds, per source bucket.
    private function claimedAmounts(Order $order): array
    {
        $claimed = ['wallet_source' => 0, 'gateway_source' => 0, 'cod_source' => 0];

        // Refunds that still count (not failed or rejected)
        $settled = $order->refunds()
            ->whereNotIn('status', [Refund::STATUS_FAILED, Refund::STATUS_REJECTED])
            ->get();

        foreach ($settled as $refund) {
            $claimed[$this->bucketOf($refund)] += (int) $refund->amount;
        }

        return $claimed;
    }

    // Which pot a refund draws from, read back off its idempotency key.
    private function bucketOf(Refund $refund): string
    {
        $key = (string) $refund->idempotency_key;

        return match (true) {
            str_contains($key, ':wallet_source') => 'wallet_source',
            str_contains($key, ':cod_source') => 'cod_source',
            default => 'gateway_source',
        };
    }

    // Message explaining why an order cannot be refunded
    private function ineligibilityReason(bool $isCod, int $refundable, int $gatewayPaid, int $walletPaid): ?string
    {
        if ($isCod) {
            return 'Cash on Delivery orders are paid at the door, so there is nothing to refund when one is cancelled.';
        }

        if ($gatewayPaid === 0 && $walletPaid === 0) {
            return 'This order has not been paid, so there is nothing to refund.';
        }

        if ($refundable === 0) {
            return 'A refund has already been issued for this order.';
        }

        return null;
    }

    // Strips anything credential-shaped before a gateway payload is stored or logged
    private function scrub(array $response): array
    {
        return collect($response)
            ->except(['store_id', 'store_passwd', 'store_password'])
            ->map(fn ($value) => is_scalar($value) || $value === null ? $value : json_encode($value))
            ->all();
    }

    // True if the database refused the insert because the key already exists
    private function isDuplicate(QueryException $e): bool
    {
        return ($e->errorInfo[1] ?? null) === 1062 || str_contains($e->getMessage(), 'Duplicate entry');
    }
}
