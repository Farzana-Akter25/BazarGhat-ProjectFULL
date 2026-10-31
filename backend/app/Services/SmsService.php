<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// Sends SMS messages (to the log in development, or through Alpha SMS)
class SmsService
{
    // provider's own reason for the most recent failure, for debugging
    private ?string $lastError = null;

    // Deliver a text message.
    public function send(string $phone, string $message): bool
    {
        // clear whatever the previous send left behind
        $this->lastError = null;

        // SMS_DRIVER in .env decides who actually carries the message
        return match (config('sms.driver')) {
            'alpha' => $this->sendViaAlpha($phone, $message),
            default => $this->sendViaLog($phone, $message),
        };
    }

    // why the last send() failed, or null if it succeeded
    public function lastError(): ?string
    {
        return $this->lastError;
    }

    // True when the OTP code may be echoed back to the client.
    public function revealsCode(): bool
    {
        // only in log mode, and only when .env asks for it — never on a real send
        return config('sms.driver') === 'log' && (bool) config('sms.expose_code');
    }

    // writes the message to the log instead of spending SMS credit
    private function sendViaLog(string $phone, string $message): bool
    {
        Log::info("[sms:log] to {$phone} — {$message}");

        // nothing can fail here, so the send always counts as delivered
        return true;
    }

    // sends through sms.net.bd (Alpha SMS)
    private function sendViaAlpha(string $phone, string $message): bool
    {
        $apiKey = config('sms.alpha.api_key');

        // the driver is selected but nobody filled in the key
        if (! $apiKey) {
            $this->lastError = 'ALPHA_SMS_API_KEY is not set.';
            Log::error('Alpha SMS is selected but ALPHA_SMS_API_KEY is not set.');

            return false;
        }

        // what the provider's form endpoint expects
        $payload = [
            'api_key' => $apiKey,
            'msg' => $message,
            'to' => $this->toLocalFormat($phone),
        ];

        // an unapproved sender id gets the whole request rejected
        if ($senderId = config('sms.alpha.sender_id')) {
            $payload['sender_id'] = $senderId;
        }

        try {
            // the timeout keeps a hung gateway from holding up the request behind it
            $response = Http::timeout((int) config('sms.timeout'))
                ->asForm()
                ->post(config('sms.alpha.url'), $payload);
        } catch (\Throwable $e) {
            // network never reached the provider
            $this->lastError = 'Could not reach the SMS gateway: ' . $e->getMessage();
            Log::error('Alpha SMS request failed', ['message' => $e->getMessage()]);

            return false;
        }

        // reached it, but it answered with an error status
        if (! $response->successful()) {
            $this->lastError = 'SMS gateway returned HTTP ' . $response->status() . '.';
            Log::error('Alpha SMS request rejected', ['response' => $response->body()]);

            return false;
        }

        // The provider's JSON answer
        $data = $response->json();

        // sms.net.bd answers HTTP 200 even for failures.
        if ((int) ($data['error'] ?? -1) !== 0) {
            // so the real verdict is read out of the body
            $this->lastError = trim(($data['msg'] ?? 'Unknown gateway error.') . ' (code ' . ($data['error'] ?? '?') . ')');
            Log::error('Alpha SMS send failed', ['response' => $data]);

            return false;
        }

        // keep the provider's request id, it is what support asks for
        Log::info('Alpha SMS sent', ['to' => $phone, 'request_id' => $data['data']['request_id'] ?? null]);

        return true;
    }

    // numbers are stored as +8801XXXXXXXXX but sms.net.bd expects no plus sign
    private function toLocalFormat(string $phone): string
    {
        return ltrim($phone, '+');
    }
}
