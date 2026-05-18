<?php

/**
 * 统一初始化
 */

// 加载登录凭据
$auth_config = require __DIR__ . '/../config/auth.php';

// Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 自动加载
spl_autoload_register(function ($class) {
    $file = __DIR__ . '/' . $class . '.php';
    if (file_exists($file)) require $file;
});
