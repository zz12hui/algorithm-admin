<?php

require __DIR__ . '/../includes/init.php';
Auth::requireLogin();

header('Content-Type: application/json; charset=utf-8');

$connId = $_GET['conn'] ?? '';
if ($connId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing conn parameter']);
    exit;
}

$action = $_GET['action'] ?? '';

try {
    $db = Database::getInstance($connId);

    switch ($action) {
        case 'list':
            handleList($db);
            break;
        case 'create':
            handleCreate($db);
            break;
        case 'update':
            handleUpdate($db);
            break;
        case 'delete':
            handleDelete($db);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleList(PDO $db): void
{
    $sort   = $_GET['sort'] ?? 'id';
    $order  = strtoupper($_GET['order'] ?? 'ASC');
    $search = trim($_GET['search'] ?? '');

    if (!in_array($sort, ['id', 'name'], true)) $sort = 'id';
    if (!in_array($order, ['ASC', 'DESC'], true)) $order = 'ASC';

    $sql    = "SELECT id, name, sendurl, algocodes, deviceids FROM algorithm_send_config";
    $params = [];

    if ($search !== '') {
        $sql .= " WHERE name LIKE :s1 OR sendurl LIKE :s2 OR algocodes LIKE :s3";
        $like = "%{$search}%";
        $params = ['s1' => $like, 's2' => $like, 's3' => $like];
    }

    $sql .= " ORDER BY `{$sort}` {$order}";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

function handleCreate(PDO $db): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    $input     = json_decode(file_get_contents('php://input'), true);
    $name      = trim($input['name'] ?? '');
    $sendurl   = trim($input['sendurl'] ?? '');
    $algocodes = trim($input['algocodes'] ?? '');
    $deviceids = trim($input['deviceids'] ?? '');

    if ($name === '') {
        echo json_encode(['success' => false, 'message' => '名称不能为空']);
        return;
    }

    $stmt = $db->prepare(
        "INSERT INTO algorithm_send_config (name, sendurl, algocodes, deviceids) VALUES (:n, :u, :a, :d)"
    );
    $stmt->execute(['n' => $name, 'u' => $sendurl, 'a' => $algocodes, 'd' => $deviceids]);
    echo json_encode(['success' => true, 'message' => '新增成功', 'id' => $db->lastInsertId()]);
}

function handleUpdate(PDO $db): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    $input     = json_decode(file_get_contents('php://input'), true);
    $id        = intval($input['id'] ?? 0);
    $name      = trim($input['name'] ?? '');
    $sendurl   = trim($input['sendurl'] ?? '');
    $algocodes = trim($input['algocodes'] ?? '');
    $deviceids = trim($input['deviceids'] ?? '');

    if ($id <= 0 || $name === '') {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $stmt = $db->prepare(
        "UPDATE algorithm_send_config SET name=:n, sendurl=:u, algocodes=:a, deviceids=:d WHERE id=:id"
    );
    $stmt->execute(['n' => $name, 'u' => $sendurl, 'a' => $algocodes, 'd' => $deviceids, 'id' => $id]);
    echo json_encode(['success' => true, 'message' => '修改成功']);
}

function handleDelete(PDO $db): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $id    = intval($input['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => '参数错误']);
        return;
    }

    $stmt = $db->prepare("DELETE FROM algorithm_send_config WHERE id=:id");
    $stmt->execute(['id' => $id]);
    echo json_encode(['success' => true, 'message' => '删除成功']);
}
