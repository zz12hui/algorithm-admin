<?php

/**
 * 登录凭据配置
 *
 * init_mode:     true = 初始化模式（首次运行或重置后），false = 正常运行
 * recovery_code: 32 位随机授权码，仅在初始化设置时显示一次
 * users:         用户凭据（明文存储，仅本地使用）
 */
return [
    'init_mode'     => true,
    'recovery_code' => '',
    'users' => [
        [
            'username' => 'admin',
            'password' => 'admin123',
        ],
    ],
];
