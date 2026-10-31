<?php

namespace App\Exceptions;

use RuntimeException;

// Thrown when a complaint status change breaks the workflow rules
class ComplaintWorkflowException extends RuntimeException
{
}
