<?php

/**
 * 连接配置持久化（JSON 文件读写）
 */
class ConnectionStore
{
    private static $file = null;

    private static function file(): string
    {
        if (self::$file === null) {
            self::$file = __DIR__ . '/../config/connections.json';
        }
        return self::$file;
    }

    public static function all(): array
    {
        if (!file_exists(self::file())) return [];
        $data = json_decode(file_get_contents(self::file()), true);
        return is_array($data) ? $data : [];
    }

    public static function find(string $id): ?array
    {
        foreach (self::all() as $conn) {
            if ($conn['id'] === $id) return $conn;
        }
        return null;
    }

    public static function save(array $connections): void
    {
        file_put_contents(
            self::file(),
            json_encode($connections, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        );
    }

    public static function add(array $conn): array
    {
        $connections = self::all();
        $conn['id'] = 'conn_' . time() . '_' . bin2hex(random_bytes(3));
        $connections[] = $conn;
        self::save($connections);
        return $conn;
    }

    public static function update(string $id, array $data): bool
    {
        $connections = self::all();
        foreach ($connections as &$conn) {
            if ($conn['id'] === $id) {
                $conn = array_merge($conn, $data);
                $conn['id'] = $id;
                self::save($connections);
                return true;
            }
        }
        return false;
    }

    public static function delete(string $id): bool
    {
        $connections = self::all();
        $filtered = array_filter($connections, function ($c) use ($id) {
            return $c['id'] !== $id;
        });
        if (count($filtered) < count($connections)) {
            self::save(array_values($filtered));
            return true;
        }
        return false;
    }
}
