<?php

class Database
{
    private static $instances = [];

    public static function getInstance(string $connectionId): PDO
    {
        if (!isset(self::$instances[$connectionId])) {
            $conn = ConnectionStore::find($connectionId);
            if (!$conn) {
                throw new RuntimeException("Connection '{$connectionId}' not found");
            }

            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $conn['host'], $conn['port'], $conn['dbname'], $conn['charset']
            );

            self::$instances[$connectionId] = new PDO($dsn, $conn['username'], $conn['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$instances[$connectionId];
    }

    public static function test(array $conn): array
    {
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $conn['host'], $conn['port'], $conn['dbname'], $conn['charset']
            );
            $pdo = new PDO($dsn, $conn['username'], $conn['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            $pdo->query('SELECT 1');
            return ['success' => true, 'message' => '连接成功'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => '连接失败: ' . $e->getMessage()];
        }
    }
}
