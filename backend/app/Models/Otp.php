<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Otp extends Model
{
    
    protected $fillable = [
        'user_id',
        'email',
        'phone',
        'otp_hash',
        'type',
        'purpose',
        'payload',
        'attempts',
        'resend_count',
        'last_sent_at',
        'expires_at',
        'verified_at',
    ];

    // Never send the hash in JSON responses
    protected $hidden = [
        'otp_hash',
    ];

    // Column type conversions
    protected $casts = [
        'payload' => 'array',
        'last_sent_at' => 'datetime',
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    // The user the code belongs to, if any
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // True once the expiry time has passed
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    // True once the code has been used successfully
    public function isVerified(): bool
    {
        return ! is_null($this->verified_at);
    }

    // True after 5 wrong guesses
    public function attemptsExhausted(): bool
    {
        return $this->attempts >= 5;
    }
}
