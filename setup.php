<?php
require __DIR__ . '/includes/init.php';
if (!Auth::isInitMode()) {
    header('Location: index.php');
    exit;
}
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>首次设置 - 数据推送配置中心</title>
    <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <style>
        :root { --bg: #f0f2f5; --primary: #4f46e5; }
        body { background: var(--bg); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .setup-card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 2.5rem; width: 100%; max-width: 460px; }
        .setup-card h3 { font-weight: 700; color: #1e293b; }
        .recovery-box {
            background: #fefce8; border: 2px dashed #eab308; border-radius: 8px;
            padding: 16px; text-align: center; margin: 16px 0;
        }
        .recovery-code {
            font-family: 'SF Mono', 'Consolas', monospace; font-size: 18px;
            font-weight: 700; color: #92400e; letter-spacing: 2px;
            word-break: break-all;
        }
        .warning-text { color: #dc2626; font-size: 13px; }
    </style>
</head>
<body>
    <div class="setup-card">
        <!-- 设置表单 -->
        <div id="setupForm">
            <div class="text-center mb-4">
                <i class="bi bi-gear-wide-connected" style="font-size:2.5rem;color:var(--primary)"></i>
                <h3 class="mt-2">首次运行设置</h3>
                <p class="text-muted small">设置管理员密码和授权恢复码</p>
            </div>
            <div id="errorMsg" class="alert alert-danger d-none"></div>
            <form id="mainForm" autocomplete="off">
                <div class="mb-3">
                    <label class="form-label">管理员账号</label>
                    <input type="text" class="form-control" id="username" value="admin" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">设置密码</label>
                    <input type="password" class="form-control" id="password" required placeholder="至少 6 位">
                </div>
                <div class="mb-3">
                    <label class="form-label">确认密码</label>
                    <input type="password" class="form-control" id="confirm" required placeholder="再次输入密码">
                </div>
                <button type="submit" class="btn w-100 text-white" style="background:var(--primary)">
                    <i class="bi bi-check2-circle me-1"></i> 完成设置
                </button>
            </form>
        </div>

        <!-- 完成后的恢复码展示 -->
        <div id="doneView" class="d-none text-center">
            <i class="bi bi-shield-check" style="font-size:3rem;color:#22c55e"></i>
            <h4 class="mt-3">设置完成</h4>
            <p class="text-muted small">系统已就绪。请妥善保管以下授权恢复码：</p>
            <div class="recovery-box">
                <div class="recovery-code" id="recoveryCode"></div>
            </div>
            <p class="warning-text">
                <i class="bi bi-exclamation-triangle-fill"></i>
                此授权码仅显示一次。如果忘记密码，可通过此码重新设置。
            </p>
            <button class="btn btn-sm btn-outline-secondary mb-3" id="btnCopyCode">
                <i class="bi bi-clipboard"></i> 复制授权码
            </button>
            <br>
            <a href="index.php" class="btn w-100 text-white" style="background:var(--primary)">
                <i class="bi bi-box-arrow-in-right"></i> 前往登录
            </a>
        </div>
    </div>

    <script>
    document.getElementById('mainForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        var btn = this.querySelector('button');
        var err = document.getElementById('errorMsg');
        var password = document.getElementById('password').value;
        if (password.length < 6) {
            err.textContent = '密码长度至少 6 位';
            err.classList.remove('d-none');
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>设置中...';
        err.classList.add('d-none');
        try {
            var res = await fetch('api/auth.php?action=setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value.trim(),
                    password: password,
                    confirm: document.getElementById('confirm').value
                })
            });
            var data = await res.json();
            if (data.success) {
                document.getElementById('setupForm').classList.add('d-none');
                document.getElementById('recoveryCode').textContent = data.recovery_code;
                document.getElementById('doneView').classList.remove('d-none');
            } else {
                err.textContent = data.message;
                err.classList.remove('d-none');
            }
        } catch (ex) {
            err.textContent = '网络错误';
            err.classList.remove('d-none');
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> 完成设置';
    });

    document.getElementById('btnCopyCode').addEventListener('click', function() {
        var code = document.getElementById('recoveryCode').textContent;
        navigator.clipboard.writeText(code).then(function() {
            var btn = document.getElementById('btnCopyCode');
            btn.innerHTML = '<i class="bi bi-check-lg"></i> 已复制';
            btn.classList.add('btn-success');
            btn.classList.remove('btn-outline-secondary');
            setTimeout(function() {
                btn.innerHTML = '<i class="bi bi-clipboard"></i> 复制授权码';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-outline-secondary');
            }, 2000);
        });
    });
    </script>
</body>
</html>
