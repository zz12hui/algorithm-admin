<?php
require __DIR__ . '/includes/init.php';
Auth::requireLogin();

$connId = $_GET['conn'] ?? '';
$conn = $connId ? ConnectionStore::find($connId) : null;
if (!$conn) {
    header('Location: connections.php');
    exit;
}
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>表管理 - 数据推送配置中心</title>
    <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <link href="assets/vendor/sweetalert2/sweetalert2.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>

<nav class="navbar">
    <div class="navbar-inner">
        <div class="navbar-left">
            <a href="connections.php" class="nav-back"><i class="bi bi-arrow-left"></i> 返回</a>
            <span class="nav-divider">|</span>
            <a class="navbar-brand"><i class="bi bi-cpu"></i> 数据推送配置中心</a><span class="nav-version">v1</span>
        </div>
        <div class="navbar-right">
            <span class="conn-info">
                <i class="bi bi-database-fill-check"></i>
                <?php echo htmlspecialchars($conn['name']); ?>
                <small><?php echo htmlspecialchars($conn['dbname']); ?></small>
            </span>
            <span class="nav-user" id="currentUser"></span>
            <a href="#" id="btnLogout" class="nav-logout"><i class="bi bi-box-arrow-right"></i> 退出</a>
        </div>
    </div>
</nav>

<div class="main-container">
    <!-- 连接信息条 -->
    <div class="conn-bar">
        <div class="conn-bar-left">
            <i class="bi bi-database-fill-check"></i>
            <div>
                <strong><?php echo htmlspecialchars($conn['name']); ?></strong>
                <span><?php echo htmlspecialchars($conn['host'] . ':' . $conn['port']); ?> / <?php echo htmlspecialchars($conn['dbname']); ?></span>
            </div>
        </div>
        <div class="conn-bar-right">
            <span class="conn-bar-user"><?php echo htmlspecialchars($conn['username']); ?></span>
        </div>
    </div>

    <div class="card">
        <div class="card-header-custom">
            <div class="header-left">
                <h5>algorithm_send_config</h5>
                <span class="badge-count" id="totalBadge">0</span>
            </div>
            <div class="header-right">
                <div class="search-box">
                    <i class="bi bi-search search-icon"></i>
                    <input type="text" class="search-input" id="searchInput" placeholder="搜索...">
                </div>
                <button class="btn-add" id="btnAdd"><i class="bi bi-plus-lg"></i> 新增</button>
            </div>
        </div>
        <div class="card-body-custom">
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="sortable" data-sort="id" style="width:80px">ID <i class="bi bi-arrow-down-up sort-icon"></i></th>
                        <th class="sortable" data-sort="name">名称 <i class="bi bi-arrow-down-up sort-icon"></i></th>
                        <th>发送URL</th>
                        <th style="width:180px">算法代码</th>
                        <th style="width:180px">设备ID</th>
                        <th style="width:120px" class="text-center">操作</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <tr><td colspan="6" class="empty-row"><div class="spinner-border spinner-border-sm"></div> 加载中...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
// 注入当前连接 ID 给 app.js
window.__CONN_ID = <?php echo json_encode($connId); ?>;
</script>
<script src="assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="assets/vendor/sweetalert2/sweetalert2.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
