<?php
/**
 * Ekhaya Price Checker notification email worker.
 * Run from cPanel Cron Jobs using PHP CLI. Keep this file outside public_html.
 */
declare(strict_types=1);

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Missing private config.php\n");
    exit(1);
}
$config = require $configFile;
foreach (['supabase_url','service_role_key','smtp_host','smtp_port','smtp_user','smtp_password','from_name'] as $key) {
    if (empty($config[$key])) {
        fwrite(STDERR, "Missing config value: {$key}\n");
        exit(1);
    }
}
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function apiRequest(string $url, array $headers, string $method = 'GET', ?array $body = null): array {
    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 25,
        ],
    ];
    if ($body !== null) {
        $options['http']['header'] .= "\r\nContent-Type: application/json";
        $options['http']['content'] = json_encode($body, JSON_UNESCAPED_SLASHES);
    }
    $context = stream_context_create($options);
    $raw = file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);
    $status = (int)($matches[1] ?? 0);
    if ($raw === false) return [$status, null, 'HTTP request failed'];
    $decoded = json_decode($raw, true);
    return [$status, $decoded, $raw];
}

function smtpRead($socket): string {
    $response = '';
    do {
        $line = fgets($socket, 515);
        if ($line === false) throw new RuntimeException('SMTP server closed the connection.');
        $response .= $line;
    } while (isset($line[3]) && $line[3] === '-');
    return $response;
}
function smtpCommand($socket, string $command, array $expected): string {
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $expected, true)) {
        throw new RuntimeException('SMTP error: ' . trim($response));
    }
    return $response;
}
function sendSmtp(array $config, string $to, string $subject, string $text, string $html): void {
    $host = (string)$config['smtp_host'];
    $port = (int)($config['smtp_port'] ?? 465);
    $socket = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$socket) throw new RuntimeException("SMTP connection failed: {$errstr} ({$errno})");
    stream_set_timeout($socket, 20);
    try {
        $greeting = smtpRead($socket);
        if ((int)substr($greeting, 0, 3) !== 220) throw new RuntimeException('SMTP greeting failed: ' . trim($greeting));
        smtpCommand($socket, 'EHLO ekhayatech.co.za', [250]);
        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode((string)$config['smtp_user']), [334]);
        smtpCommand($socket, base64_encode((string)$config['smtp_password']), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $config['smtp_user'] . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);

        $boundary = 'ekhaya_' . bin2hex(random_bytes(12));
        $fromName = '=?UTF-8?B?' . base64_encode((string)$config['from_name']) . '?=';
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = [
            'From: ' . $fromName . ' <' . $config['smtp_user'] . '>',
            'To: <' . $to . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
            'Date: ' . date(DATE_RFC2822),
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n";
        $message .= "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split(base64_encode($text));
        $message .= "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split(base64_encode($html));
        $message .= "--{$boundary}--\r\n";
        $message = preg_replace('/(^|\r\n)\./', '$1..', $message);
        fwrite($socket, $message . "\r\n.\r\n");
        $response = smtpRead($socket);
        if ((int)substr($response, 0, 3) !== 250) throw new RuntimeException('SMTP delivery rejected: ' . trim($response));
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

$baseUrl = rtrim((string)$config['supabase_url'], '/');
$serviceKey = (string)$config['service_role_key'];
$headers = ['apikey: ' . $serviceKey, 'Authorization: Bearer ' . $serviceKey];
[$status, $pending, $raw] = apiRequest(
    $baseUrl . '/rest/v1/user_notifications?email_status=eq.pending&select=id,user_id,title,message,action_url,created_at&order=created_at.asc&limit=25',
    $headers
);
if ($status < 200 || $status >= 300 || !is_array($pending)) {
    fwrite(STDERR, "Could not load email queue: HTTP {$status} {$raw}\n");
    exit(1);
}
if (!$pending) {
    echo "No pending notification emails.\n";
    exit(0);
}

[$userStatus, $userPayload, $userRaw] = apiRequest(
    $baseUrl . '/auth/v1/admin/users?page=1&per_page=1000',
    $headers
);
if ($userStatus < 200 || $userStatus >= 300 || !is_array($userPayload)) {
    fwrite(STDERR, "Could not resolve recipients: HTTP {$userStatus} {$userRaw}\n");
    exit(1);
}
$users = isset($userPayload['users']) ? $userPayload['users'] : $userPayload;
$emailById = [];
$nameById = [];
foreach ($users as $user) {
    if (empty($user['id'])) continue;
    $uid = (string)$user['id'];
    if (!empty($user['email'])) $emailById[$uid] = $user['email'];
    $meta = $user['user_metadata'] ?? [];
    $nameById[$uid] = trim((string)($meta['display_name'] ?? $meta['full_name'] ?? $meta['name'] ?? ''));
}
[$profileStatus, $profiles, $profileRaw] = apiRequest(
    $baseUrl . '/rest/v1/profiles?select=id,display_name',
    $headers
);
if ($profileStatus >= 200 && $profileStatus < 300 && is_array($profiles)) {
    foreach ($profiles as $profile) {
        if (!empty($profile['id']) && !empty($profile['display_name'])) {
            $nameById[(string)$profile['id']] = trim((string)$profile['display_name']);
        }
    }
}

$sent = 0;
$failed = 0;
foreach ($pending as $item) {
    $id = (string)$item['id'];
    $recipient = $emailById[$item['user_id']] ?? null;
    if (!$recipient || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        apiRequest($baseUrl . '/rest/v1/user_notifications?id=eq.' . rawurlencode($id), $headers, 'PATCH', [
            'email_status' => 'skipped',
            'email_error' => 'No valid email address found for this account.',
        ]);
        continue;
    }

    // Atomically claim this row so overlapping cron executions do not send it twice.
    [$claimStatus, $claimed] = apiRequest(
        $baseUrl . '/rest/v1/user_notifications?id=eq.' . rawurlencode($id) . '&email_status=eq.pending',
        array_merge($headers, ['Prefer: return=representation']),
        'PATCH',
        ['email_status' => 'failed', 'email_error' => 'Delivery attempt in progress.']
    );
    if ($claimStatus < 200 || $claimStatus >= 300 || !is_array($claimed) || count($claimed) === 0) continue;

    try {
        $title = (string)$item['title'];
        $message = (string)$item['message'];
        $sellerName = $nameById[(string)$item['user_id']] ?? '';
        if ($sellerName === '') $sellerName = 'there';
        $action = isset($item['action_url']) && preg_match('#^https://#i', (string)$item['action_url'])
            ? (string)$item['action_url'] : '';
        $greeting = 'Hi ' . $sellerName . ',';
        if (!preg_match('/^\\s*Hi\\s+/i', $message)) {
            $message = $greeting . "\\n\\n" . $message;
        }
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeName = htmlspecialchars($sellerName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        $safeAction = $action ? htmlspecialchars($action, ENT_QUOTES, 'UTF-8') : '';
        $sectionLabel = 'EKHAYA PRICE CHECKER';
        $html = '<div style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#10243b">'
            . '<div style="max-width:900px;margin:0 auto;background:#ffffff;border-left:1px solid #dce6ef;border-right:1px solid #dce6ef">'
            . '<div style="padding:27px 54px 30px;border-bottom:1px solid #dce6ef;background:#ffffff">'
            . '<div style="font-size:22px;line-height:1.3;letter-spacing:2px;font-weight:800;color:#10243b"><span style="color:#079bd3">EKHAYA</span> TECHNOLOGIES</div>'
            . '<div style="margin-top:8px;font-size:14px;letter-spacing:2px;color:#7188a3">DIGITAL SOLUTIONS · BUILT AROUND YOU</div>'
            . '</div>'
            . '<div style="padding:52px 54px 48px">'
            . '<div style="font-size:16px;letter-spacing:3px;font-weight:700;color:#079bd3;text-transform:uppercase;margin-bottom:22px">' . $sectionLabel . '</div>'
            . '<h1 style="font-size:42px;line-height:1.15;font-weight:700;color:#10243b;margin:0 0 22px">' . $safeTitle . '</h1>'
            . '<div style="font-size:18px;line-height:1.8;color:#536b84">' . $safeMessage . '</div>'
            . ($safeAction ? '<p style="margin:42px 0 38px"><a href="' . $safeAction . '" style="display:inline-block;background:#079bd3;color:#ffffff;padding:23px 38px;text-decoration:none;border-radius:12px;font-size:18px;font-weight:700">Open Ekhaya Price Checker</a></p>' : '')
            . '<div style="margin-top:42px;font-size:15px;line-height:1.8;color:#7188a3">For your security, do not share private account links or payment information with anyone.</div>'
            . '</div>'
            . '<div style="padding:24px 54px;border-top:1px solid #dce6ef;background:#ffffff;color:#7188a3;font-size:13px;line-height:1.7">Ekhaya Price Checker · An Ekhaya Technologies Product<br><strong style="color:#10243b">Know the numbers before you invest.</strong><br>Buy smarter. Sell smarter. Grow with confidence.</div>'
            . '</div></div>';
        $plain = $message . ($action ? "\\n\\n" . $action : '');
        sendSmtp($config, $recipient, $title, $plain, $html);
        apiRequest($baseUrl . '/rest/v1/user_notifications?id=eq.' . rawurlencode($id), $headers, 'PATCH', [
            'email_status' => 'sent',
            'email_sent_at' => gmdate('c'),
            'email_error' => null,
        ]);
        $sent++;
    } catch (Throwable $error) {
        apiRequest($baseUrl . '/rest/v1/user_notifications?id=eq.' . rawurlencode($id), $headers, 'PATCH', [
            'email_status' => 'pending',
            'email_error' => substr($error->getMessage(), 0, 500),
        ]);
        fwrite(STDERR, "Notification {$id} failed: " . $error->getMessage() . "\n");
        $failed++;
    }
}
echo "Notification email worker complete. Sent: {$sent}; failed: {$failed}.\n";
exit($failed > 0 ? 1 : 0);
