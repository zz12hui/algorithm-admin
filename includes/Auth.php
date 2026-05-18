<?php

class Auth
{
    public static function login(string $username, string $password): bool
    {
        $config = $GLOBALS['auth_config'];
        foreach ($config['users'] as $user) {
            if ($user['username'] === $username && $user['password'] === $password) {
                session_regenerate_id(true);
                $_SESSION['user'] = $username;
                return true;
            }
        }
        return false;
    }

    public static function isLoggedIn(): bool
    {
        return isset($_SESSION['user']);
    }

    public static function username(): string
    {
        return $_SESSION['user'] ?? '';
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']);
        }
        session_destroy();
    }

    public static function requireLogin(): void
    {
        if (!self::isLoggedIn()) {
            header('Location: index.php');
            exit;
        }
    }

    public static function isInitMode(): bool
    {
        return !empty($GLOBALS['auth_config']['init_mode']);
    }

    public static function completeSetup(string $username, string $password): string
    {
        $code = bin2hex(random_bytes(16)); // 32 位随机授权码
        $config = $GLOBALS['auth_config'];
        $config['init_mode']     = false;
        $config['recovery_code'] = $code;
        $config['users'] = [
            [
                'username' => $username,
                'password' => $password,
            ],
        ];
        self::writeConfig($config);
        $GLOBALS['auth_config'] = $config;
        return $code;
    }

    public static function resetPassword(string $recoveryCode, string $newPassword): bool
    {
        $config = $GLOBALS['auth_config'];
        if (empty($config['recovery_code']) || $config['recovery_code'] !== $recoveryCode) {
            return false;
        }
        $config['users'][0]['password'] = $newPassword;
        self::writeConfig($config);
        $GLOBALS['auth_config'] = $config;
        return true;
    }

    private static function writeConfig(array $config): void
    {
        $path = __DIR__ . '/../config/auth.php';
        $code = "<?php\n\nreturn " . var_export($config, true) . ";\n";
        file_put_contents($path, $code);
    }
}
