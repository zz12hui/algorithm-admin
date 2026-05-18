# Algorithm Admin

PHP 管理面板，用于管理 MySQL 数据库连接和对 `algorithm_send_config` 表的 CRUD 操作。

## 技术栈

- **后端**: PHP + PDO (支持 MySQL)
- **前端**: Bootstrap 5 + SweetAlert2 + 原生 JS
- **部署**: Docker + Apache + Kubernetes

## 快速开始

### 本地开发（Mock 模式）

无需 MySQL/Apache/PHP，使用 Node.js mock 服务器：

```bash
node server.js
# 访问 http://localhost:8088
# 登录: admin / admin123
```

Mock 服务器在内存中重新实现了所有 PHP API 端点，预填充了 `demo` 连接和 5 条示例数据。

### Docker 部署

```bash
docker build -t algorithm-admin .
docker run -p 8080:80 algorithm-admin
```

或使用构建脚本：

```bash
./build.sh                  # 构建 + 导出 tar
TAG=v2 ./build.sh           # 自定义标签
```

## 页面流程

登录 (`index.php`) → 连接列表 (`connections.php`) → 数据表看板 (`dashboard.php?conn=<id>`)

## 配置

- `config/auth.php` — 用户认证配置
- `config/connections.json` — 数据库连接配置

## 安全

- `config/` 和 `includes/` 目录通过 `.htaccess` 阻止直接访问
- API 响应中连接密码字段已剥离
- 首次运行强制密码设置流程

## License

MIT
