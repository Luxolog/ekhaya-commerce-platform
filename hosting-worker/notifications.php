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
foreach ($users as $user) {
    if (!empty($user['id']) && !empty($user['email'])) $emailById[$user['id']] = $user['email'];
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
        $action = isset($item['action_url']) && preg_match('#^https://#i', (string)$item['action_url'])
            ? (string)$item['action_url'] : '';
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        $safeAction = $action ? htmlspecialchars($action, ENT_QUOTES, 'UTF-8') : '';
        $html = '<div style="margin:0;padding:32px 12px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#142b45">'
            . '<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5ebf2;border-radius:14px;overflow:hidden">'
            . '<div style="padding:24px 30px;background:#102b46;color:#ffffff">'
            . '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a9dff1">EKHAYA TECHNOLOGIES</div>'
            . '<div style="font-size:22px;font-weight:700;margin-top:8px">Ekhaya Price Checker</div>'
            . '</div>'
            . '<div style="padding:30px">'
            . '<h2 style="font-size:22px;line-height:1.3;margin:0 0 18px;color:#102b46">' . $safeTitle . '</h2>'
            . '<div style="font-size:15px;line-height:1.75;color:#34465b">' . $safeMessage . '</div>'
            . ($safeAction ? '<p style="margin:28px 0 8px"><a href="' . $safeAction . '" style="display:inline-block;background:#079bd3;color:#ffffff;padding:13px 21px;text-decoration:none;border-radius:7px;font-weight:700">Open Ekhaya Price Checker</a></p>' : '')
            . '</div>'
            . '<div style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e8eef4;color:#64748b;font-size:12px;line-height:1.6">'
            . '<strong style="color:#102b46">Know the numbers before you invest.</strong><br>'
            . 'Buy smarter. Sell smarter. Grow with confidence.<br>'
            . 'An Ekhaya Technologies Product'
            . '</div></div></div>';
        $plain = $title . "\n\n" . $message . ($action ? "\n\n" . $action : '');
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
