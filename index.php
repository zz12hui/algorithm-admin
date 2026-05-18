<?php
require __DIR__ . '/includes/init.php';

// 初始化模式 → 跳转设置页
if (Auth::isInitMode()) {
    header('Location: setup.php');
    exit;
}

if (Auth::isLoggedIn()) {
    header('Location: connections.php');
    exit;
}
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - 数据推送配置中心</title>
    <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <style>
        :root { --bg: #f0f2f5; --primary: #4f46e5; }
        body { background: var(--bg); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 2.5rem; width: 100%; max-width: 400px; }
        .login-card h3 { font-weight: 700; color: #1e293b; }
        .forgot-link { font-size: 13px; text-decoration: none; color: var(--primary); cursor: pointer; }
        .forgot-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="login-card">
        <div id="loginView">
            <div class="text-center mb-4">
                <i class="bi bi-shield-lock" style="font-size:2.5rem;color:var(--primary)"></i>
                <h3 class="mt-2">数据推送配置中心 <span class="nav-version" style="vertical-align: middle;">v1</span></h3>
                <p class="text-muted small">登录以管理数据库配置</p>
            </div>
            <div id="errorMsg" class="alert alert-danger d-none"></div>
            <form id="loginForm" autocomplete="off">
                <div class="mb-3">
                    <label class="form-label">用户名</label>
                    <input type="text" class="form-control" id="username" required autofocus>
                </div>
                <div class="mb-3">
                    <label class="form-label">密码</label>
                    <input type="password" class="form-control" id="password" required>
                </div>
                <button type="submit" class="btn w-100 text-white mb-2" style="background:var(--primary)">
                    <i class="bi bi-box-arrow-in-right me-1"></i> 登 录
                </button>
            </form>
            <div class="text-center">
                <a class="forgot-link" id="btnForgot"><i class="bi bi-question-circle"></i> 忘记密码？</a>
            </div>
        </div>

        <!-- 忘记密码 / 重置 -->
        <div id="resetView" class="d-none">
            <div class="text-center mb-4">
                <i class="bi bi-arrow-repeat" style="font-size:2.5rem;color:var(--primary)"></i>
                <h4 class="mt-2">重置密码</h4>
                <p class="text-muted small">输入首次设置时保存的授权恢复码</p>
            </div>
            <div id="resetError" class="alert alert-danger d-none"></div>
            <div id="resetSuccess" class="alert alert-success d-none"></div>
            <form id="resetForm" autocomplete="off">
                <div class="mb-3">
                    <label class="form-label">授权恢复码</label>
                    <input type="text" class="form-control" id="resetCode" required placeholder="32 位字符" style="font-family:'SF Mono',Consolas,monospace;font-size:13px">
                </div>
                <div class="mb-3">
                    <label class="form-label">新密码</label>
                    <input type="password" class="form-control" id="resetPassword" required placeholder="至少 6 位">
                </div>
                <div class="mb-3">
                    <label class="form-label">确认新密码</label>
                    <input type="password" class="form-control" id="resetConfirm" required placeholder="再次输入密码">
                </div>
                <button type="submit" class="btn w-100 text-white mb-2" style="background:var(--primary)">
                    <i class="bi bi-check2-circle me-1"></i> 重置密码
                </button>
            </form>
            <div class="text-center">
                <a class="forgot-link" id="btnBackLogin"><i class="bi bi-arrow-left"></i> 返回登录</a>
            </div>
        </div>
    </div>

    <script>
    // ===== 登录 =====
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        var btn = this.querySelector('button');
        var err = document.getElementById('errorMsg');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>登录中...';
        err.classList.add('d-none');
        try {
            var res = await fetch('api/auth.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            });
            var data = await res.json();
            if (data.success) { window.location.href = 'connections.php'; }
            else { err.textContent = data.message; err.classList.remove('d-none'); }
        } catch (ex) { err.textContent = '网络错误'; err.classList.remove('d-none'); }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> 登 录';
    });

    // ===== 忘记密码 / 返回登录 切换 =====
    document.getElementById('btnForgot').addEventListener('click', function() {
        document.getElementById('loginView').classList.add('d-none');
        document.getElementById('resetView').classList.remove('d-none');
        document.getElementById('resetError').classList.add('d-none');
        document.getElementById('resetSuccess').classList.add('d-none');
    });
    document.getElementById('btnBackLogin').addEventListener('click', function() {
        document.getElementById('resetView').classList.add('d-none');
        document.getElementById('loginView').classList.remove('d-none');
        document.getElementById('errorMsg').classList.add('d-none');
    });

    // ===== 重置密码 =====
    document.getElementById('resetForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        var btn = this.querySelector('button');
        var err = document.getElementById('resetError');
        var ok  = document.getElementById('resetSuccess');
        var password = document.getElementById('resetPassword').value;
        if (password.length < 6) {
            err.textContent = '密码长度至少 6 位';
            err.classList.remove('d-none');
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>重置中...';
        err.classList.add('d-none');
        ok.classList.add('d-none');
        try {
            var res = await fetch('api/auth.php?action=reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recovery_code: document.getElementById('resetCode').value.trim(),
                    password: password,
                    confirm: document.getElementById('resetConfirm').value
                })
            });
            var data = await res.json();
            if (data.success) {
                ok.textContent = data.message + '，即将返回登录...';
                ok.classList.remove('d-none');
                document.getElementById('resetForm').reset();
                setTimeout(function () {
                    document.getElementById('resetView').classList.add('d-none');
                    document.getElementById('loginView').classList.remove('d-none');
                    ok.classList.add('d-none');
                }, 1500);
            } else {
                err.textContent = data.message;
                err.classList.remove('d-none');
            }
        } catch (ex) {
            err.textContent = '网络错误';
            err.classList.remove('d-none');
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> 重置密码';
    });
    </script>
</body>
</html>
