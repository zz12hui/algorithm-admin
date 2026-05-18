<?php

require __DIR__ . '/../includes/init.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }
    $input    = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if ($username === '' || $password === '') {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        exit;
    }
    if (Auth::login($username, $password)) {
        echo json_encode(['success' => true, 'message' => '登录成功']);
    } else {
        echo json_encode(['success' => false, 'message' => '用户名或密码错误']);
    }
    exit;
}

if ($action === 'logout') {
    Auth::logout();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check') {
    echo json_encode([
        'logged_in' => Auth::isLoggedIn(),
        'username'  => Auth::username(),
        'init_mode' => Auth::isInitMode(),
    ]);
    exit;
}

if ($action === 'setup') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }
    if (!Auth::isInitMode()) {
        echo json_encode(['success' => false, 'message' => '系统已完成初始化设置']);
        exit;
    }
    $input    = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? 'admin');
    $password = $input['password'] ?? '';
    $confirm  = $input['confirm'] ?? '';

    if ($username === '' || $password === '') {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        exit;
    }
    if (mb_strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => '密码长度至少 6 位']);
        exit;
    }
    if ($password !== $confirm) {
        echo json_encode(['success' => false, 'message' => '两次输入的密码不一致']);
        exit;
    }
    $code = Auth::completeSetup($username, $password);
    echo json_encode([
        'success'       => true,
        'message'       => '系统初始化完成',
        'recovery_code' => $code,
    ]);
    exit;
}

if ($action === 'reset') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }
    $input        = json_decode(file_get_contents('php://input'), true);
    $recoveryCode = trim($input['recovery_code'] ?? '');
    $newPassword  = $input['password'] ?? '';
    $confirm      = $input['confirm'] ?? '';

    if ($recoveryCode === '' || $newPassword === '') {
        echo json_encode(['success' => false, 'message' => '授权码和新密码不能为空']);
        exit;
    }
    if (mb_strlen($newPassword) < 6) {
        echo json_encode(['success' => false, 'message' => '密码长度至少 6 位']);
        exit;
    }
    if ($newPassword !== $confirm) {
        echo json_encode(['success' => false, 'message' => '两次输入的密码不一致']);
        exit;
    }
    if (Auth::resetPassword($recoveryCode, $newPassword)) {
        echo json_encode(['success' => true, 'message' => '密码已重置，请使用新密码登录']);
    } else {
        echo json_encode(['success' => false, 'message' => '授权码无效']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['success' => false]);
