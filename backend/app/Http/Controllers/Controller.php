<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

// Base controller every other controller extends
class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;
}
