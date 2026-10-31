<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

// Admin business performance report.
class ReportController extends Controller
{
    // Presets the report screen offers, in days.
    private const PRESET_DAYS = [
        '7_days' => 7,
        '30_days' => 30,
    ];

    // the service that actually builds the report
    public function __construct(private ReportService $reports)
    {
    }

    // GET /admin/reports — one report for the requested period
    public function index(Request $request)
    {
        // only these three shapes of request are accepted
        $validated = $request->validate([
            'report_type' => 'nullable|in:7_days,30_days,custom',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        // no type asked for means the 7 day report
        $type = $validated['report_type'] ?? '7_days';

        // turn the request into a real start and end moment
        [$from, $to] = $this->resolveRange($type, $validated);

        // hand the period to the service and return whatever it reports
        return response()->json(
            $this->reports->build($from, $to, $this->label($type, $from, $to), $request->user()),
        );
    }

    // Date filtering happens here rather than in the browser
    private function resolveRange(string $type, array $validated): array
    {
        // a custom report uses the two dates the admin picked
        if ($type === 'custom' && ! empty($validated['start_date']) && ! empty($validated['end_date'])) {
            return [
                // from the first moment of the start date
                CarbonImmutable::parse($validated['start_date'])->startOfDay(),
                // to the last moment of the end date
                CarbonImmutable::parse($validated['end_date'])->endOfDay(),
            ];
        }

        // a preset counts back from today, falling back to 7 days
        $days = self::PRESET_DAYS[$type] ?? self::PRESET_DAYS['7_days'];
        $to = CarbonImmutable::now()->endOfDay();

        // today counts as one of the days, hence the -1
        return [$to->subDays($days - 1)->startOfDay(), $to];
    }

    // the title printed on the report itself
    private function label(string $type, CarbonImmutable $from, CarbonImmutable $to): string
    {
        return match ($type) {
            '7_days' => '7 Days Sales Report',
            '30_days' => '30 Days Sales Report',
            // a custom range names its own length
            default => 'Custom Range Sales Report (' . ($from->diffInDays($to) + 1) . ' Days)',
        };
    }
}
