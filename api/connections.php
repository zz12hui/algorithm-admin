<?php

require __DIR__ . '/../includes/init.php';
Auth::requireLogin();

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            $list = ConnectionStore::all();
            // 返回时脱敏密码
            $safe = array_map(function ($c) {
                unset($c['password']);
                return $c;
            }, $list);
            echo json_encode(['success' => true, 'connections' => $safe]);
            break;

        case 'create':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method not allowed']);
                return;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $name  = trim($input['name'] ?? '');
            if ($name === '') {
                echo json_encode(['success' => false, 'message' => '连接名称不能为空']);
                return;
            }
            $conn = ConnectionStore::add([
                'name'     => $name,
                'host'     => trim($input['host'] ?? '127.0.0.1'),
                'port'     => intval($input['port'] ?? 3306),
                'dbname'   => trim($input['dbname'] ?? ''),
                'username' => trim($input['username'] ?? ''),
                'password' => $input['password'] ?? '',
                'charset'  => 'utf8mb4',
            ]);
            unset($conn['password']);
            echo json_encode(['success' => true, 'message' => '连接已添加', 'connection' => $conn]);
            break;

        case 'update':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method not allowed']);
                return;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $id    = trim($input['id'] ?? '');
            $name  = trim($input['name'] ?? '');
            if ($id === '' || $name === '') {
                echo json_encode(['success' => false, 'message' => '参数不完整']);
                return;
            }
            $ok = ConnectionStore::update($id, [
                'name'     => $name,
                'host'     => trim($input['host'] ?? '127.0.0.1'),
                'port'     => intval($input['port'] ?? 3306),
                'dbname'   => trim($input['dbname'] ?? ''),
                'username' => trim($input['username'] ?? ''),
                'password' => $input['password'] ?? '',
                'charset'  => 'utf8mb4',
            ]);
            echo json_encode(['success' => $ok, 'message' => $ok ? '连接已更新' : '连接不存在']);
            break;

        case 'delete':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method not allowed']);
                return;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $id    = trim($input['id'] ?? '');
            $ok    = ConnectionStore::delete($id);
            echo json_encode(['success' => $ok, 'message' => $ok ? '连接已删除' : '连接不存在']);
            break;

        case 'test':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method not allowed']);
                return;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            // 支持传入 id 测试已有连接，或传入完整配置测试新连接
            $testId = trim($input['id'] ?? '');
            if ($testId !== '') {
                $conn = ConnectionStore::find($testId);
                if (!$conn) {
                    echo json_encode(['success' => false, 'message' => '连接不存在']);
                    return;
                }
                $result = Database::test($conn);
            } else {
                $result = Database::test($input);
            }
            echo json_encode($result);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
