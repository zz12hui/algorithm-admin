(function () {
'use strict';

var API_BASE = 'api/config.php';
var CONN_API = 'api/connections.php';
var AUTH_API = 'api/auth.php';
var isDashboard = !!window.__CONN_ID;
var connId = window.__CONN_ID || '';

// ===== Dashboard state =====
var currentSort  = 'id';
var currentOrder = 'asc';
var searchTimer  = null;
var cachedRows   = [];

// ===== Shared Init =====
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();

    if (isDashboard) {
        initDashboard();
    } else {
        initConnections();
    }

    // Logout
    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function (e) {
            e.preventDefault();
            fetch(AUTH_API + '?action=logout').then(function () {
                window.location.href = 'index.php';
            });
        });
    }
});

function checkAuth() {
    fetch(AUTH_API + '?action=check')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.logged_in) { window.location.href = 'index.php'; return; }
            var el = document.getElementById('currentUser');
            if (el) el.textContent = data.username;
        })
        .catch(function () { window.location.href = 'index.php'; });
}

// ==========================================
//  Connections Page
// ==========================================
function initConnections() {
    var listEl = document.getElementById('connList');
    document.getElementById('btnAddConn').addEventListener('click', function () {
        showConnForm(null, function () { loadConnections(listEl); });
    });
    loadConnections(listEl);
}

function loadConnections(listEl) {
    fetch(CONN_API + '?action=list')
        .then(function (r) { return r.json(); })
        .then(function (json) {
            if (!json.success) { listEl.innerHTML = '<div class="empty-state">加载失败</div>'; return; }
            if (json.connections.length === 0) {
                listEl.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>暂无数据库连接</p><small>点击「添加连接」配置第一个数据库</small></div>';
                return;
            }
            renderConnCards(json.connections, listEl);
        })
        .catch(function () { listEl.innerHTML = '<div class="empty-state">网络错误</div>'; });
}

function renderConnCards(connections, listEl) {
    var html = '<div class="conn-grid">';
    connections.forEach(function (c) {
        html += ''
        + '<div class="conn-card">'
        +   '<div class="conn-card-header">'
        +     '<div class="conn-card-name"><i class="bi bi-database-fill-check"></i> ' + esc(c.name) + '</div>'
        +     '<div class="conn-card-actions">'
        +       '<button class="btn-outline" onclick="App.testConn(\'' + escAttr(c.id) + '\')" title="测试连接"><i class="bi bi-lightning-charge"></i> 测试</button>'
        +       '<button class="btn-outline" onclick="App.editConn(\'' + escAttr(c.id) + '\')" title="编辑"><i class="bi bi-pencil"></i></button>'
        +       '<button class="btn-outline danger" onclick="App.deleteConn(\'' + escAttr(c.id) + '\', \'' + escAttr(c.name) + '\')" title="删除"><i class="bi bi-trash"></i></button>'
        +     '</div>'
        +   '</div>'
        +   '<div class="conn-card-meta">'
        +     '<span>' + esc(c.host) + ':' + esc(c.port) + '</span>'
        +     '<span>库: <strong>' + esc(c.dbname) + '</strong></span>'
        +     '<span>用户: <strong>' + esc(c.username) + '</strong></span>'
        +     '<span>编码: ' + esc(c.charset) + '</span>'
        +   '</div>'
        +   '<div class="conn-card-footer">'
        +     '<span class="conn-status" id="status_' + escAttr(c.id) + '"></span>'
        +     '<button class="btn-add" onclick="App.viewConn(\'' + escAttr(c.id) + '\')"><i class="bi bi-eye"></i> 查看表数据</button>'
        +   '</div>'
        + '</div>';
    });
    html += '</div>';
    listEl.innerHTML = html;
}

// ==== Connection CRUD ====
window.App = {
    viewConn: function (id) {
        window.location.href = 'dashboard.php?conn=' + encodeURIComponent(id);
    },

    testConn: function (id) {
        var statusEl = document.getElementById('status_' + id);
        statusEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 测试中...';
        statusEl.className = 'conn-status';
        // 获取连接完整信息（需要密码）
        fetch(CONN_API + '?action=list')
            .then(function (r) { return r.json(); })
            .then(function (json) {
                // 密码在 API 中已脱敏，所以前端没有密码，只能通过后端代理测试
                // 用单独接口：传入 id，后端用已存储的连接信息测试
                return fetch(CONN_API + '?action=test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                });
            })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.success) {
                    statusEl.innerHTML = '<i class="bi bi-check-circle"></i> 连接正常';
                    statusEl.className = 'conn-status ok';
                } else {
                    statusEl.innerHTML = '<i class="bi bi-x-circle"></i> ' + esc(res.message);
                    statusEl.className = 'conn-status err';
                }
            })
            .catch(function () {
                statusEl.innerHTML = '<i class="bi bi-x-circle"></i> 测试失败';
                statusEl.className = 'conn-status err';
            });
    },

    editConn: function (id) {
        // 需要获取完整连接信息（含密码）
        fetch(CONN_API + '?action=list')
            .then(function (r) { return r.json(); })
            .then(function (json) {
                var conn = null;
                for (var i = 0; i < json.connections.length; i++) {
                    if (json.connections[i].id === id) { conn = json.connections[i]; break; }
                }
                if (!conn) { showToast('error', '连接不存在'); return; }
                showConnForm(conn, function () {
                    loadConnections(document.getElementById('connList'));
                });
            });
    },

    deleteConn: function (id, name) {
        Swal.fire({
            title: '确认删除',
            html: '确定要删除连接 <strong>"' + esc(name) + '"</strong> 吗？<br>此操作不可恢复。',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '确认删除',
            confirmButtonColor: '#dc2626',
            cancelButtonText: '取消',
            reverseButtons: true
        }).then(function (result) {
            if (!result.isConfirmed) return;
            fetch(CONN_API + '?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            })
            .then(function (r) { return r.json(); })
            .then(function (json) {
                showToast(json.success ? 'success' : 'error', json.message);
                if (json.success) loadConnections(document.getElementById('connList'));
            })
            .catch(function () { showToast('error', '请求失败'); });
        });
    }
};

// ==== Connection Form Modal ====
function showConnForm(conn, callback) {
    var isEdit = !!conn;
    var title  = isEdit ? '编辑连接' : '添加连接';

    var html = ''
        + '<div class="mb-3 text-start">'
        +   '<label class="form-label small fw-semibold">连接名称 <span class="text-danger">*</span></label>'
        +   '<input class="form-control swal2-input-custom" id="fName" value="' + (conn ? escAttr(conn.name) : '') + '" placeholder="例：生产环境 - 10.0.0.50">'
        + '</div>'
        + '<div class="row mb-0">'
        +   '<div class="col-8 mb-3 text-start">'
        +     '<label class="form-label small fw-semibold">主机地址</label>'
        +     '<input class="form-control swal2-input-custom" id="fHost" value="' + (conn ? escAttr(conn.host) : '127.0.0.1') + '" placeholder="127.0.0.1">'
        +   '</div>'
        +   '<div class="col-4 mb-3 text-start">'
        +     '<label class="form-label small fw-semibold">端口</label>'
        +     '<input class="form-control swal2-input-custom" id="fPort" value="' + (conn ? conn.port : 3306) + '" placeholder="3306">'
        +   '</div>'
        + '</div>'
        + '<div class="mb-3 text-start">'
        +   '<label class="form-label small fw-semibold">数据库名</label>'
        +   '<input class="form-control swal2-input-custom" id="fDbname" value="' + (conn ? escAttr(conn.dbname) : 'algorithm') + '" placeholder="algorithm">'
        + '</div>'
        + '<div class="row mb-0">'
        +   '<div class="col-6 mb-3 text-start">'
        +     '<label class="form-label small fw-semibold">用户名</label>'
        +     '<input class="form-control swal2-input-custom" id="fUser" value="' + (conn ? escAttr(conn.username) : 'root') + '" placeholder="root">'
        +   '</div>'
        +   '<div class="col-6 mb-3 text-start">'
        +     '<label class="form-label small fw-semibold">密码</label>'
        +     '<input class="form-control swal2-input-custom" id="fPass" type="password" value="' + (conn ? escAttr(conn.password || '') : '') + '" placeholder="留空则无密码">'
        +   '</div>'
        + '</div>';

    Swal.fire({
        title: title,
        html: html,
        width: 560,
        confirmButtonText: isEdit ? '保存修改' : '添加并测试',
        confirmButtonColor: '#4f46e5',
        showCancelButton: true,
        cancelButtonText: '取消',
        showDenyButton: true,
        denyButtonText: '仅保存',
        denyButtonColor: '#64748b',
        preConfirm: function () {
            return collectConnForm();
        }
    }).then(function (result) {
        if (result.isDenied) {
            saveConn(isEdit, conn, collectConnForm(), callback);
        }
        if (result.isConfirmed) {
            var data = collectConnForm();
            if (!data) return;
            // 先测试
            Swal.fire({ title: '测试连接中...', allowOutsideClick: false, didOpen: function () { Swal.showLoading(); } });
            fetch(CONN_API + '?action=test', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                Swal.close();
                if (res.success) {
                    Swal.fire({ icon: 'success', title: '连接成功', text: '是否保存此连接？', showCancelButton: true, confirmButtonText: '保存', confirmButtonColor: '#4f46e5' })
                        .then(function (r2) { if (r2.isConfirmed) saveConn(isEdit, conn, data, callback); });
                } else {
                    Swal.fire({ icon: 'error', title: '连接失败', text: res.message, showCancelButton: true, confirmButtonText: '仍然保存', cancelButtonText: '返回修改' })
                        .then(function (r2) { if (r2.isConfirmed) saveConn(isEdit, conn, data, callback); });
                }
            })
            .catch(function () {
                Swal.close();
                showToast('error', '测试请求失败');
            });
        }
    });
}

function collectConnForm() {
    var name = document.getElementById('fName').value.trim();
    if (!name) { Swal.showValidationMessage('连接名称不能为空'); return false; }
    return {
        name:     name,
        host:     document.getElementById('fHost').value.trim() || '127.0.0.1',
        port:     parseInt(document.getElementById('fPort').value) || 3306,
        dbname:   document.getElementById('fDbname').value.trim(),
        username: document.getElementById('fUser').value.trim(),
        password: document.getElementById('fPass').value
    };
}

function saveConn(isEdit, oldConn, data, callback) {
    var action = isEdit ? 'update' : 'create';
    var body = data;
    if (isEdit) body.id = oldConn.id;

    fetch(CONN_API + '?action=' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    .then(function (r) { return r.json(); })
    .then(function (json) {
        showToast(json.success ? 'success' : 'error', json.message);
        if (json.success && callback) callback();
    })
    .catch(function () { showToast('error', '保存失败'); });
}

// ==========================================
//  Dashboard Page (table CRUD)
// ==========================================
function initDashboard() {
    document.getElementById('btnAdd').addEventListener('click', showCreateModal);
    document.getElementById('searchInput').addEventListener('input', debounceSearch);

    document.querySelectorAll('th.sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            var col = th.dataset.sort;
            currentOrder = (currentSort === col && currentOrder === 'asc') ? 'desc' : 'asc';
            currentSort  = col;
            updateSortIcons();
            loadTableData();
        });
    });

    document.getElementById('tableBody').addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var tr = btn.closest('tr');
        var id = parseInt(tr.dataset.id);
        if (btn.classList.contains('copy-btn')) { copyUrl(btn, btn.dataset.copy); }
        else if (btn.classList.contains('btn-edit')) { showEditModal(id); }
        else if (btn.classList.contains('btn-delete')) { confirmDelete(id, tr.querySelector('td:nth-child(2)').textContent); }
    });

    loadTableData();
}

function loadTableData() {
    var search = document.getElementById('searchInput').value.trim();
    var params = 'action=list&sort=' + currentSort + '&order=' + currentOrder + '&conn=' + encodeURIComponent(connId);
    if (search) params += '&search=' + encodeURIComponent(search);

    fetch(API_BASE + '?' + params)
        .then(function (r) { return r.json(); })
        .then(function (json) {
            if (!json.success) { showToast('error', json.message); return; }
            cachedRows = json.data;
            renderTable(json.data);
            document.getElementById('totalBadge').textContent = json.data.length;
        })
        .catch(function () { showToast('error', '加载数据失败'); });
}

function renderTable(rows) {
    var tbody = document.getElementById('tableBody');
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">暂无数据</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(function (r) {
        return '<tr data-id="' + esc(r.id) + '">'
            + '<td><span class="fw-semibold">' + esc(r.id) + '</span></td>'
            + '<td><span class="cell-text" title="' + escAttr(r.name) + '">' + esc(r.name) + '</span></td>'
            + '<td><div class="url-cell"><span class="url-text" title="' + escAttr(r.sendurl) + '">' + esc(r.sendurl) + '</span><button class="copy-btn" title="复制URL" data-copy="' + escAttr(r.sendurl) + '"><i class="bi bi-clipboard"></i></button></div></td>'
            + '<td><div class="url-cell"><code class="url-text small" title="' + escAttr(r.algocodes) + '">' + esc(r.algocodes) + '</code><button class="copy-btn" title="复制编码" data-copy="' + escAttr(r.algocodes) + '"><i class="bi bi-clipboard"></i></button></div></td>'
            + '<td><div class="url-cell"><span class="url-text" title="' + escAttr(r.deviceids) + '">' + esc(r.deviceids) + '</span><button class="copy-btn" title="复制设备ID" data-copy="' + escAttr(r.deviceids) + '"><i class="bi bi-clipboard"></i></button></div></td>'
            + '<td class="text-center">'
                + '<button class="action-btn btn-edit" title="编辑"><i class="bi bi-pencil"></i></button>'
                + '<button class="action-btn delete btn-delete ms-1" title="删除"><i class="bi bi-trash"></i></button>'
            + '</td>'
        + '</tr>';
    }).join('');
}

function updateSortIcons() {
    document.querySelectorAll('th.sortable').forEach(function (th) {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sort === currentSort) th.classList.add(currentOrder);
    });
}

function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(loadTableData, 300); }

// ==== Table CRUD ====
function showCreateModal() {
    Swal.fire({
        title: '新增配置',
        html: buildFormHTML({name:'', sendurl:'', algocodes:'', deviceids:''}),
        confirmButtonText: '确认新增',
        confirmButtonColor: '#4f46e5',
        showCancelButton: true, cancelButtonText: '取消',
        preConfirm: collectFormData
    }).then(function (r) { if (r.isConfirmed) sendCreate(r.value); });
}

function showEditModal(id) {
    var row = null;
    for (var i = 0; i < cachedRows.length; i++) { if (cachedRows[i].id == id) { row = cachedRows[i]; break; } }
    if (!row) { showToast('error', '记录未找到'); return; }
    Swal.fire({
        title: '编辑配置', html: buildFormHTML(row),
        confirmButtonText: '保存修改', confirmButtonColor: '#4f46e5',
        showCancelButton: true, cancelButtonText: '取消',
        preConfirm: collectFormData
    }).then(function (r) { if (r.isConfirmed) sendUpdate(id, r.value); });
}

function confirmDelete(id, name) {
    Swal.fire({
        title: '确认删除', html: '确定要删除 <strong>"' + esc(name) + '"</strong> 吗？<br>此操作不可恢复。',
        icon: 'warning', showCancelButton: true,
        confirmButtonText: '确认删除', confirmButtonColor: '#dc2626', cancelButtonText: '取消', reverseButtons: true
    }).then(function (r) { if (r.isConfirmed) sendDelete(id); });
}

function sendCreate(data) {
    fetch(API_BASE + '?action=create&conn=' + encodeURIComponent(connId), {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
    }).then(function (r) { return r.json(); }).then(function (json) {
        showToast(json.success ? 'success' : 'error', json.message);
        if (json.success) loadTableData();
    });
}
function sendUpdate(id, data) {
    data.id = id;
    fetch(API_BASE + '?action=update&conn=' + encodeURIComponent(connId), {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
    }).then(function (r) { return r.json(); }).then(function (json) {
        showToast(json.success ? 'success' : 'error', json.message);
        if (json.success) loadTableData();
    });
}
function sendDelete(id) {
    fetch(API_BASE + '?action=delete&conn=' + encodeURIComponent(connId), {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: id})
    }).then(function (r) { return r.json(); }).then(function (json) {
        showToast(json.success ? 'success' : 'error', json.message);
        if (json.success) loadTableData();
    });
}

// ==========================================
//  Shared Helpers
// ==========================================
function buildFormHTML(row) {
    return ''
        + '<div class="mb-3 text-start">'
        +   '<label class="form-label small fw-semibold">名称 <span class="text-danger">*</span></label>'
        +   '<input class="form-control swal2-input-custom" id="swalName" value="' + escAttr(row.name) + '" placeholder="配置名称">'
        + '</div>'
        + '<div class="mb-3 text-start">'
        +   '<label class="form-label small fw-semibold">发送URL</label>'
        +   '<input class="form-control swal2-input-custom" id="swalSendurl" value="' + escAttr(row.sendurl) + '" placeholder="https://...">'
        + '</div>'
        + '<div class="mb-3 text-start">'
        +   '<label class="form-label small fw-semibold">算法代码</label>'
        +   '<textarea class="form-control swal2-input-custom" id="swalAlgocodes" rows="2" placeholder="算法代码列表">' + esc(row.algocodes) + '</textarea>'
        + '</div>'
        + '<div class="mb-3 text-start">'
        +   '<label class="form-label small fw-semibold">设备ID</label>'
        +   '<textarea class="form-control swal2-input-custom" id="swalDeviceids" rows="2" placeholder="设备ID列表">' + esc(row.deviceids) + '</textarea>'
        + '</div>';
}

function collectFormData() {
    var name = document.getElementById('swalName').value.trim();
    if (!name) { Swal.showValidationMessage('名称不能为空'); return false; }
    return {
        name:      name,
        sendurl:   document.getElementById('swalSendurl').value.trim(),
        algocodes: document.getElementById('swalAlgocodes').value.trim(),
        deviceids: document.getElementById('swalDeviceids').value.trim()
    };
}

function showToast(icon, title) {
    Swal.fire({ toast: true, position: 'top-end', icon: icon, title: title, showConfirmButton: false, timer: 2500, timerProgressBar: true });
}

function esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}

function copyUrl(btn, text) {
    navigator.clipboard.writeText(text).then(function () {
        var icon = btn.querySelector('i');
        icon.className = 'bi bi-check-lg';
        btn.classList.add('copied');
        setTimeout(function () {
            icon.className = 'bi bi-clipboard';
            btn.classList.remove('copied');
        }, 1500);
    }).catch(function () {
        showToast('error', '复制失败');
    });
}
})();
