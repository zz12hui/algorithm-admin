# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Run the mock dev server (port 8088):
```bash
node server.js
```
Login: `admin` / `admin123`. The mock server reimplements all PHP API endpoints entirely in-memory — no MySQL, Apache, or PHP required for local development. It serves PHP files as templates, replacing PHP blocks with in-memory session/connection state.

For production, build and run the Docker image:
```bash
docker build -t algorithm-admin .
docker run -p 8080:80 algorithm-admin
```
Or use the helper script:
```bash
./build.sh                  # build + export tar
TAG=v2 ./build.sh           # custom tag
```

**Mock server pre-populates** `demo` connection with 5 sample rows covering normal, long-URL, and long-algocode scenarios. The project version badge (`v1`) is displayed in the navbar of every page.

There are no tests, linters, build steps, or package managers in this project. All third-party frontend dependencies are vendored locally in `assets/vendor/` — no CDN or internet access required at runtime.

## Architecture

A PHP admin panel for managing MySQL database connections and CRUD on an `algorithm_send_config` table (columns: `id`, `name`, `sendurl`, `algocodes`, `deviceids`).

**Page flow:** Login (`index.php`) → Connection list (`connections.php`) → Table dashboard (`dashboard.php?conn=<id>`)

### Backend (PHP)

- `includes/init.php` — bootstrap: loads `config/auth.php`, starts session, registers a PSR-4-style autoloader for `includes/`.
- `includes/Auth.php` — session-based login against `$auth_config['users']` array. Multi-user capable but defaults to a single `admin` user.
- `includes/ConnectionStore.php` — reads/writes connection configs to `config/connections.json` (JSON flat file, no DB).
- `includes/Database.php` — PDO factory. Maintains singleton PDO instances per connection ID. Also has a static `test()` method for validating new connections.
- `api/auth.php` — `?action=login|logout|check` (login is POST with JSON body).
- `api/connections.php` — `?action=list|create|update|delete|test`. Passwords are stripped from `list` responses. All endpoints require login except login/logout/check.
- `api/config.php` — `?action=list|create|update|delete&conn=<id>`. CRUD against the real `algorithm_send_config` table via PDO. Supports `?sort=id|name&order=ASC|DESC&search=<term>` on list.

### Frontend (vanilla JS)

- `assets/js/app.js` — single IIFE containing all UI logic for both the connections page and the dashboard. No framework — just fetch() calls to the PHP API + Bootstrap 5 + SweetAlert2 for modals/toasts.
- `assets/css/style.css` — custom styles for cards, tables, navbar, etc.
- `assets/vendor/` — all third-party libraries (Bootstrap 5.3.0, Bootstrap Icons 1.11.0, SweetAlert2 11). Downloaded locally for offline/air-gapped deployment.

The dashboard page injects `window.__CONN_ID` via PHP `echo json_encode()` so the JS knows which connection to operate on.

### Config

- `config/auth.php` — returns an array of `users` (username/password pairs, plain text). Edit this to change credentials.
- `config/connections.json` — persisted connection configs. Each connection has `id`, `name`, `host`, `port`, `dbname`, `username`, `password`, `charset`.

### Security notes

- `config/` and `includes/` are blocked from direct web access: Apache via `.htaccess` `RewriteRule ... - [F,L]`, and the Node mock server returns 403 for these paths.
- API responses that list connections strip the `password` field.
- Passwords are stored as plain text in `config/connections.json` and `config/auth.php`.

## Deployment

- `Dockerfile` — php:7.3-apache base, installs `pdo_mysql`, enables `mod_rewrite`, copies all source, removes `server.js` from final image.
- `k8s.yaml` — single-replica Deployment + ClusterIP Service. Has commented-out PVC mount for persisting connection config.

## Auth System

First-run flows are enforced before any login is allowed:

- `setup.php` — initial password + recovery code setup (shown once). Generates a 32-char hex recovery code via `bin2hex(random_bytes(16))`.
- `index.php` — redirects to `setup.php` if `setup_complete` is false; otherwise shows login form with "forgot password" link.
- `api/auth.php?action=setup` — completes setup, writes config back to `config/auth.php`.
- `api/auth.php?action=reset` — accepts recovery code + new password, rewrites `config/auth.php`.

The mock server (`server.js`) mirrors this with an `authStore` object persisted to `config/auth.json`. On fresh checkout there is no `auth.json`, so the first run triggers setup.
