<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

// Email that carries a one-time verification code (sent through the queue)
class OtpMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    // The code, the email heading and the intro text
    public function __construct(
        public string $code,
        public string $heading,
        public string $intro,
    ) {
    }

    // Build the email: subject, template and the values it shows
    public function build()
    {
        return $this->subject("Your BazarGhat verification code: {$this->code}")
            ->view('emails.otp')
            ->with([
                'code' => $this->code,
                'heading' => $this->heading,
                'intro' => $this->intro,
                'minutes' => \App\Services\OtpService::EXPIRY_MINUTES,
            ]);
    }
}
