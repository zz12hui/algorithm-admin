/**
 * Mock 开发服务器
 * 用法: node server.js
 * 访问: http://localhost:8088
 */
var http = require('http');
var fs   = require('fs');
var path = require('path');
var url  = require('url');
var qs   = require('querystring');
var crypto = require('crypto');

var PORT = 8088;
var ROOT = __dirname;

// 模拟 session
var sessionUser = null;

// 认证存储 (持久化到 config/auth.json)
var AUTH_FILE = path.join(ROOT, 'config', 'auth.json');
var authStore = { init_mode: true, recovery_code: '', users: [{ username: 'admin', password: 'admin123' }] };
try { var loaded = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); if (loaded) authStore = loaded; } catch (e) {}
function saveAuth() { try { fs.writeFileSync(AUTH_FILE, JSON.stringify(authStore, null, 2)); } catch (e) {} }

// 模拟连接存储（持久化到内存，对应 config/connections.json）
var connections;
var nextConnId;

// 模拟表数据（按连接 ID 隔离）
var tableData;
function getTable(connId) {
    if (!tableData[connId]) tableData[connId] = [];
    return tableData[connId];
}
var nextRowId;

// 初始化模式：清空所有数据，仅保留 demo 连接壳
if (authStore.init_mode) {
    tableData = {};
    nextRowId = 1;
    connections = [
        { id: 'demo', name: '示例连接', host: '127.0.0.1', port: 3306, dbname: 'algorithm', username: 'root', password: '', charset: 'utf8mb4' }
    ];
    nextConnId = 1;
    // 预填充 demo 连接的示例数据
    tableData['demo'] = [
        { id: nextRowId++, name: '示例算法配置A', sendurl: 'http://127.0.0.1:8080/api/send', algocodes: 'ALGO_SORT,ALGO_FILTER', deviceids: 'DEV_001,DEV_002,DEV_003' },
        { id: nextRowId++, name: '测试推送通道B', sendurl: 'http://192.168.1.100:9090/push', algocodes: 'ALGO_RANK', deviceids: 'DEV_010,DEV_011' },
        { id: nextRowId++, name: '生产环境规则C', sendurl: 'https://prod.example.com/algorithm/notify', algocodes: 'ALGO_DETECT,ALGO_MATCH,ALGO_SORT', deviceids: 'NODE_A1,NODE_A2,NODE_B3' },
        { id: nextRowId++, name: '超长URL推送通道', sendurl: 'https://api-prod-us-east-1.example.com/v3/algorithm/push/notify?region=us-east-1&cluster=prod&timeout=30&retry=3&compact=true&sign=sha256', algocodes: 'ALGO_RANK_V2', deviceids: 'DEV_100' },
        { id: nextRowId++, name: '多算法组合处理', sendurl: 'http://192.168.50.10:9090/processor', algocodes: 'ALGO_DETECT,ALGO_MATCH,ALGO_SORT,ALGO_RANK,ALGO_FILTER,ALGO_MERGE,ALGO_SPLIT,ALGO_VALIDATE,ALGO_EXPORT', deviceids: 'DEV_001,DEV_002,DEV_003,DEV_004,DEV_005,DEV_006,DEV_007,DEV_008,DEV_009,DEV_010' }
    ];
} else {
    tableData = {};
    nextRowId = 1;
    connections = [
        { id: 'demo', name: '示例连接', host: '127.0.0.1', port: 3306, dbname: 'algorithm', username: 'root', password: '', charset: 'utf8mb4' }
    ];
    nextConnId = 1;
    tableData['demo'] = [
        { id: nextRowId++, name: '示例算法配置A', sendurl: 'http://127.0.0.1:8080/api/send', algocodes: 'ALGO_SORT,ALGO_FILTER', deviceids: 'DEV_001,DEV_002,DEV_003' },
        { id: nextRowId++, name: '测试推送通道B', sendurl: 'http://192.168.1.100:9090/push', algocodes: 'ALGO_RANK', deviceids: 'DEV_010,DEV_011' },
        { id: nextRowId++, name: '生产环境规则C', sendurl: 'https://prod.example.com/algorithm/notify', algocodes: 'ALGO_DETECT,ALGO_MATCH,ALGO_SORT', deviceids: 'NODE_A1,NODE_A2,NODE_B3' },
        { id: nextRowId++, name: '超长URL推送通道', sendurl: 'https://api-prod-us-east-1.example.com/v3/algorithm/push/notify?region=us-east-1&cluster=prod&timeout=30&retry=3&compact=true&sign=sha256', algocodes: 'ALGO_RANK_V2', deviceids: 'DEV_100' },
        { id: nextRowId++, name: '多算法组合处理', sendurl: 'http://192.168.50.10:9090/processor', algocodes: 'ALGO_DETECT,ALGO_MATCH,ALGO_SORT,ALGO_RANK,ALGO_FILTER,ALGO_MERGE,ALGO_SPLIT,ALGO_VALIDATE,ALGO_EXPORT', deviceids: 'DEV_001,DEV_002,DEV_003,DEV_004,DEV_005,DEV_006,DEV_007,DEV_008,DEV_009,DEV_010' }
    ];
}

// MIME
var MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };

function serveStatic(req, res, filePath) {
    var ext = path.extname(filePath);
    fs.readFile(filePath, function (err, data) {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
        res.end(data);
    });
}

function json(res, obj, status) {
    res.writeHead(status || 200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
    var body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () { cb(body); });
}

// ===== API Router =====
function handleAPI(req, res, apiPath) {
    var parsed = url.parse(req.url);
    var params = qs.parse(parsed.query);
    var action = params.action || '';

    // ---- auth.php ----
    if (apiPath === '/api/auth.php') {
        // setup: 首次设置 (无需登录)
        if (action === 'setup' && req.method === 'POST') {
            if (!authStore.init_mode) { json(res, {success:false,message:'系统已完成初始化设置'}); return; }
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var username = (input.username || '').trim() || 'admin';
                var password = input.password || '';
                var confirm  = input.confirm || '';
                if (!username || !password) { json(res, {success:false,message:'用户名和密码不能为空'}); return; }
                if (password.length < 6) { json(res, {success:false,message:'密码长度至少 6 位'}); return; }
                if (password !== confirm) { json(res, {success:false,message:'两次输入的密码不一致'}); return; }
                var code = crypto.randomBytes(16).toString('hex'); // 32 位
                authStore.init_mode = false;
                authStore.recovery_code = code;
                authStore.users = [{ username: username, password: password }];
                saveAuth();
                json(res, {success:true,message:'系统初始化完成',recovery_code:code});
            });
            return;
        }

        // reset: 忘记密码 (无需登录)
        if (action === 'reset' && req.method === 'POST') {
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var code     = (input.recovery_code || '').trim();
                var password = input.password || '';
                var confirm  = input.confirm || '';
                if (!code || !password) { json(res, {success:false,message:'授权码和新密码不能为空'}); return; }
                if (password.length < 6) { json(res, {success:false,message:'密码长度至少 6 位'}); return; }
                if (password !== confirm) { json(res, {success:false,message:'两次输入的密码不一致'}); return; }
                if (!authStore.recovery_code || authStore.recovery_code !== code) {
                    json(res, {success:false,message:'授权码无效'});
                    return;
                }
                authStore.users[0].password = password;
                saveAuth();
                json(res, {success:true,message:'密码已重置，请使用新密码登录'});
            });
            return;
        }

        // login
        if (action === 'login' && req.method === 'POST') {
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                if (!input.username || !input.password) { json(res, {success:false,message:'用户名和密码不能为空'}); return; }
                var found = false;
                authStore.users.forEach(function (u) {
                    if (u.username === input.username && u.password === input.password) { found = true; }
                });
                if (found) {
                    sessionUser = input.username;
                    json(res, {success:true,message:'登录成功'});
                } else {
                    json(res, {success:false,message:'用户名或密码错误'});
                }
            });
            return;
        }
        if (action === 'logout') { sessionUser = null; json(res, {success:true}); return; }
        if (action === 'check') { json(res, {logged_in:!!sessionUser,username:sessionUser||'',init_mode:authStore.init_mode}); return; }
        json(res, {success:false}); return;
    }

    // 以下需登录
    if (!sessionUser) { json(res, {success:false,message:'Unauthorized'}, 401); return; }

    // ---- connections.php ----
    if (apiPath === '/api/connections.php') {
        if (action === 'list') {
            var safe = connections.map(function (c) {
                var o = {};
                Object.keys(c).forEach(function (k) { if (k !== 'password') o[k] = c[k]; });
                return o;
            });
            json(res, {success:true,connections:safe}); return;
        }

        if (action === 'create' && req.method === 'POST') {
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                if (!(input.name || '').trim()) { json(res, {success:false,message:'连接名称不能为空'}); return; }
                var conn = {
                    id: 'conn_' + Date.now() + '_' + (nextConnId++),
                    name: input.name.trim(),
                    host: input.host || '127.0.0.1',
                    port: parseInt(input.port) || 3306,
                    dbname: input.dbname || '',
                    username: input.username || '',
                    password: input.password || '',
                    charset: 'utf8mb4'
                };
                connections.push(conn);
                var safe = JSON.parse(JSON.stringify(conn));
                delete safe.password;
                json(res, {success:true,message:'连接已添加',connection:safe});
            });
            return;
        }

        if (action === 'update' && req.method === 'POST') {
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var found = false;
                connections = connections.map(function (c) {
                    if (c.id === input.id) { found = true;
                        c.name     = input.name || c.name;
                        c.host     = input.host || c.host;
                        c.port     = parseInt(input.port) || c.port;
                        c.dbname   = input.dbname || c.dbname;
                        c.username = input.username || c.username;
                        if (input.password !== undefined) c.password = input.password;
                    }
                    return c;
                });
                json(res, {success:found,message:found?'连接已更新':'连接不存在'});
            });
            return;
        }

        if (action === 'delete' && req.method === 'POST') {
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var before = connections.length;
                connections = connections.filter(function (c) { return c.id !== input.id; });
                json(res, {success:connections.length < before,message:connections.length < before?'连接已删除':'连接不存在'});
            });
            return;
        }

        if (action === 'test' && req.method === 'POST') {
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var testId = (input.id || '').trim();
                var conn;
                if (testId) {
                    conn = connections.find(function (c) { return c.id === testId; });
                    if (!conn) { json(res, {success:false,message:'连接不存在'}); return; }
                } else {
                    conn = input;
                }
                json(res, {success:true,message:'连接成功'});
            });
            return;
        }

        json(res, {success:false,message:'Unknown action'}); return;
    }

    // ---- config.php (table CRUD) ----
    if (apiPath === '/api/config.php') {
        var connId = params.conn || '';
        if (!connId) { json(res, {success:false,message:'Missing conn'}, 400); return; }

        if (action === 'list') {
            var rows = getTable(connId);
            var search = (params.search || '').trim();
            var result = rows;
            if (search) {
                result = rows.filter(function (r) {
                    return r.name.indexOf(search) !== -1 || r.sendurl.indexOf(search) !== -1 || r.algocodes.indexOf(search) !== -1;
                });
            }
            var sort  = params.sort || 'id';
            var order = (params.order || 'ASC').toUpperCase();
            result.sort(function (a, b) {
                var va = a[sort], vb = b[sort];
                if (typeof va === 'number') return order === 'ASC' ? va - vb : vb - va;
                return order === 'ASC' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });
            json(res, {success:true,data:result}); return;
        }

        if (action === 'create') {
            if (req.method !== 'POST') { json(res, {success:false,message:'Method not allowed'}, 405); return; }
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var name = (input.name || '').trim();
                if (!name) { json(res, {success:false,message:'名称不能为空'}); return; }
                var row = { id: nextRowId++, name: name, sendurl: input.sendurl||'', algocodes: input.algocodes||'', deviceids: input.deviceids||'' };
                getTable(connId).push(row);
                json(res, {success:true,message:'新增成功',id:row.id});
            });
            return;
        }

        if (action === 'update') {
            if (req.method !== 'POST') { json(res, {success:false,message:'Method not allowed'}, 405); return; }
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var rows = getTable(connId);
                var found = false;
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i].id === parseInt(input.id)) {
                        rows[i].name      = input.name;
                        rows[i].sendurl   = input.sendurl;
                        rows[i].algocodes = input.algocodes;
                        rows[i].deviceids = input.deviceids;
                        found = true; break;
                    }
                }
                json(res, {success:found,message:found?'修改成功':'记录不存在'});
            });
            return;
        }

        if (action === 'delete') {
            if (req.method !== 'POST') { json(res, {success:false,message:'Method not allowed'}, 405); return; }
            readBody(req, function (body) {
                var input = JSON.parse(body || '{}');
                var rid = parseInt(input.id);
                var rows = getTable(connId);
                var before = rows.length;
                tableData[connId] = rows.filter(function (r) { return r.id !== rid; });
                json(res, {success:tableData[connId].length < before,message:tableData[connId].length < before?'删除成功':'记录不存在'});
            });
            return;
        }

        json(res, {success:false,message:'Unknown action'}); return;
    }

    json(res, {success:false}, 404);
}

// ===== Server =====
var server = http.createServer(function (req, res) {
    var parsed   = url.parse(req.url);
    var filePath = path.join(ROOT, parsed.pathname);

    // API
    if (parsed.pathname.indexOf('/api/') === 0) {
        handleAPI(req, res, parsed.pathname);
        return;
    }

    // Index
    if (parsed.pathname === '/') {
        filePath = path.join(ROOT, 'index.php');
    }

    // Block sensitive dirs (before PHP handler)
    if (parsed.pathname.indexOf('/config/') === 0 || parsed.pathname.indexOf('/includes/') === 0) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    // PHP -> template rendering
    if (filePath.slice(-4) === '.php') {
        fs.readFile(filePath, 'utf8', function (err, data) {
            if (err) { res.writeHead(404); res.end('Not found'); return; }

            var qparams = qs.parse(parsed.query);

            // setup.php: redirect if already set up
            if (filePath.indexOf('setup.php') !== -1) {
                if (!authStore.init_mode) {
                    res.writeHead(302, { 'Location': 'index.php' });
                    res.end(); return;
                }
            }

            // index.php: redirect if not set up → setup.php; if logged in → connections.php
            if (filePath.indexOf('index.php') !== -1) {
                if (authStore.init_mode) {
                    res.writeHead(302, { 'Location': 'setup.php' });
                    res.end(); return;
                }
                if (sessionUser) {
                    res.writeHead(302, { 'Location': 'connections.php' });
                    res.end(); return;
                }
            }

            // connections.php: require login
            if (filePath.indexOf('connections.php') !== -1 && !sessionUser) {
                res.writeHead(302, { 'Location': 'index.php' });
                res.end(); return;
            }

            // dashboard.php: require login + conn param
            if (filePath.indexOf('dashboard.php') !== -1) {
                if (!sessionUser) {
                    res.writeHead(302, { 'Location': 'index.php' });
                    res.end(); return;
                }
                var cid = qparams.conn || '';
                var conn = null;
                for (var i = 0; i < connections.length; i++) {
                    if (connections[i].id === cid) { conn = connections[i]; break; }
                }
                if (!conn) {
                    res.writeHead(302, { 'Location': 'connections.php' });
                    res.end(); return;
                }

                // Replace PHP blocks with actual data
                data = data.replace(/<\?php[\s\S]*?\?>/g, function (match) {
                    var result = match;

                    result = result.replace(/echo htmlspecialchars\(\$conn\['name'\]\);/g,   JSON.stringify(conn.name).slice(1, -1));
                    result = result.replace(/echo htmlspecialchars\(\$conn\['host'\] \. ':' \. \$conn\['port'\]\);/g, conn.host + ':' + conn.port);
                    result = result.replace(/echo htmlspecialchars\(\$conn\['dbname'\]\);/g,  conn.dbname);
                    result = result.replace(/echo htmlspecialchars\(\$conn\['username'\]\);/g, conn.username);
                    result = result.replace(/echo json_encode\(\$connId\);/g, JSON.stringify(cid));

                    if (result !== match) {
                        return result.replace(/<\?php|\?>/g, '');
                    }
                    return '';
                });
            } else {
                // Other pages: just strip PHP tags
                data = data.replace(/<\?php[\s\S]*?\?>/g, '');
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    serveStatic(req, res, filePath);
});

server.listen(PORT, function () {
    console.log('');
    console.log('  数据推送配置中心 Mock 服务器已启动!');
    console.log('  URL:     http://localhost:' + PORT);
    if (authStore.init_mode) {
        console.log('  ⚠  初始化模式，请访问 http://localhost:' + PORT + '/setup.php 完成设置');
    } else {
        console.log('  登录:    admin / (已设置的密码)');
    }
    console.log('  初始连接: 示例连接 (demo)');
    console.log('');
});
