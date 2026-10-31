<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail.
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// A login account: admin, customer or delivery man (role column)
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'role',
        'status',
        'password',
        'email_verified_at',
        'phone_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'password' => 'hashed',
        'wallet_balance' => 'integer',
    ];

    // wallet_balance is intentionally absent from $fillable.

    // Orders placed by this customer
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    // Delivery details when the user is a delivery man
    public function deliveryProfile()
    {
        return $this->hasOne(DeliveryProfile::class);
    }

    // Wallet ledger entries, newest first
    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class, 'customer_id')->orderByDesc('id');
    }

    // Refunds for this customer, newest first
    public function refunds()
    {
        return $this->hasMany(Refund::class, 'customer_id')->orderByDesc('id');
    }
}
