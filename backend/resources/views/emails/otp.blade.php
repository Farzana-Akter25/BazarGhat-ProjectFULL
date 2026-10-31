<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="background:#f97316;padding:20px 32px;">
                            <span style="color:#ffffff;font-size:20px;font-weight:bold;">BazarGhat</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="margin:0 0 12px;color:#1f2937;font-size:18px;">{{ $heading }}</h2>
                            <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5;">{{ $intro }}</p>
                            <div style="text-align:center;margin:24px 0;">
                                <span style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:bold;color:#f97316;background:#fff7ed;padding:12px 24px;border-radius:8px;">{{ $code }}</span>
                            </div>
                            <p style="margin:0;color:#6b7280;font-size:13px;">This code expires in {{ $minutes }} minutes. If you didn't request this, you can safely ignore this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
