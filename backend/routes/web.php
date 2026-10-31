<?php

use Illuminate\Support\Facades\Route;

// Web Routes: Web routes for the application are registered here.

// Default Laravel welcome page
Route::get('/', function () {
    return view('welcome');
});
