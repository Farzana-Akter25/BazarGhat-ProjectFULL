<?php

use Illuminate\Support\Facades\Broadcast;



// A user may only listen on their own private channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
