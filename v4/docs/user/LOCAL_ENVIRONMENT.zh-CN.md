# V4 本地环境变量配置

V4 支持一个只存在于本机的环境文件：

```text
v4/.env.local
```

这个文件用于保存 Databento key、数据库路径等本机参数。它已经被 `.gitignore` 忽略，不会被提交或 push。

## 创建文件

从模板复制：

```powershell
cd v4
copy .env.local.example .env.local
```

Linux/macOS：

```bash
cd v4
cp .env.local.example .env.local
```

然后编辑 `v4/.env.local`。

## 常用内容

```text
DATABENTO_API_KEY=你的_databento_key

# 可选：如果数据库不在默认位置，设置绝对路径
# V4_TRADING_DB=C:\path\to\trading_data.duckdb
```

不要把真实 key 写入 `.env.local.example`、文档、代码或截图。

## 使用方式

Windows 启动脚本会自动读取：

```powershell
cd v4
.\start_windows.ps1 -Action restart
```

Linux/macOS 启动脚本也会自动读取：

```bash
cd v4
bash start.sh restart
```

修改 `.env.local` 后，必须重启 API。只刷新浏览器不会让 API 进程拿到新参数。

## 前端页面修改

也可以在 Data Maintenance 页面修改本地环境：

```text
http://127.0.0.1:8001/data-maintenance.html
```

页面顶部的 `Environment` 区域可以：

- 查看 `DATABENTO_API_KEY` / `V4_TRADING_DB` / `V4_WEB_PORT` 是否在 `.env.local` 和当前 API 进程中存在
- 保存变量到 `v4/.env.local`
- 删除变量

Secret 值不会在页面输出里明文显示，只显示 masked 状态。保存 `DATABENTO_API_KEY` 后，会立即写入当前 API 进程环境，Refresh Range 的 dry-run/write 可以直接使用；`V4_TRADING_DB` 和 `V4_WEB_PORT` 这类启动参数仍建议重启服务后再用。

## 和系统环境变量的关系

`.env.local` 是项目级本地配置，优先适合这套 V4 系统使用。

系统环境变量仍然可用，例如 PowerShell 里的：

```powershell
setx DATABENTO_API_KEY "..."
```

但如果 API 已经启动，设置系统环境变量后仍然要重启 API。`.env.local` 的好处是参数跟着项目目录走，迁移 Windows 机器时更容易检查和修改。

## 验证

重启后打开：

```text
http://127.0.0.1:8001/data-maintenance.html
```

在 Refresh Range 里运行 `Dry Run`。如果仍提示：

```text
DATABENTO_API_KEY is required in the environment for Databento dry-run/write
```

说明 API 进程没有读取到 `.env.local`，优先检查：

- 文件名是否正好是 `.env.local`
- 文件是否放在 `v4/` 目录下
- 行格式是否是 `KEY=value`
- 修改后是否执行了 `restart`
