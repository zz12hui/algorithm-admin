<?php
require __DIR__ . '/includes/init.php';
Auth::requireLogin();
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>数据库连接 - 数据推送配置中心</title>
    <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <link href="assets/vendor/sweetalert2/sweetalert2.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>

<nav class="navbar">
    <div class="navbar-inner">
        <a class="navbar-brand"><i class="bi bi-cpu"></i> 数据推送配置中心</a><span class="nav-version">v1</span>
        <div class="navbar-right">
            <span class="nav-user" id="currentUser"></span>
            <a href="#" id="btnLogout" class="nav-logout"><i class="bi bi-box-arrow-right"></i> 退出</a>
        </div>
    </div>
</nav>

<div class="main-container">
    <div class="page-header">
        <h4><i class="bi bi-server"></i> 数据库连接</h4>
        <button class="btn-add" id="btnAddConn"><i class="bi bi-plus-lg"></i> 添加连接</button>
    </div>

    <div id="connList">
        <div class="empty-state">加载中...</div>
    </div>
</div>

<script src="assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="assets/vendor/sweetalert2/sweetalert2.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
