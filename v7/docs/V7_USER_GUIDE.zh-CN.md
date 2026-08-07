# Replay Lab V7 中文用户指南

适用分支：`v7/rebuild`

当前状态：V7 基础功能已经实现，阶段一总体验收仍在进行中。本指南描述当前可用行为，
不代表所有人工验收门已经关闭。

## 1. V7 是什么

Replay Lab V7 是面向主观 SMC/ICT 交易者的历史行情回放工作站。目前主要支持 ES、
NQ 分钟数据，用于创建回放 Session、多周期/多窗格观察、逐根推进和连续播放。

当前版本不包含实盘连接、下单、成交撮合、Journal、Validation Campaign，也不是完整
的多用户 SaaS 系统。公网部署使用浏览器 Basic Auth；登录用户名同时作为跨电脑状态的
隔离标识。秒级/Tick 回放已经明确延期，不是当前阶段的缺失故障；分钟级 V7 可以独立
完成历史回放、验证和刻意练习。

## 2. 安装前准备

### 2.1 支持的 Linux 主机

一键部署支持：

- Debian/Ubuntu（`apt`）；
- Fedora/RHEL/Rocky/Alma/Alibaba Linux（`dnf`）；
- Arch Linux（`pacman`）；
- 已自行准备依赖的其他 systemd Linux。

最低规格为云厂商标称 512 MB 内存的实例，Linux `MemTotal` 必须至少为 450 MiB。
部署脚本会根据内存和 CPU 自动限制 DuckDB，并在小内存主机上补足持久化 swap。

公网 IP 或公网域名模式需要云安全组和主机防火墙允许 TCP 80/443。不要开放
8007、8766、8767、8768。

### 2.2 拉取当前分支

全新主机执行：

```bash
git clone --branch v7/rebuild --single-branch \
  https://github.com/luosangjinba/nq-backtesting.git backtesting-v7
cd backtesting-v7
```

不要只拉取默认 `main` 分支；V7 当前工作位于 `v7/rebuild`。

## 3. 一键部署

V7 统一使用 `v7/deploy/linux/deploy.sh`。第一次部署时选择访问方式；成功后，脚本会
把不含密码的部署配置保存到 `/etc/replay-lab/deployment.conf`。

### 3.1 本机访问

```bash
sudo bash v7/deploy/linux/deploy.sh --local
```

打开：

```text
http://127.0.0.1:8007/v7/app/
```

本机模式不需要公网 IP、域名、Caddy 公网证书或浏览器密码。

### 3.2 远程主机，仅通过 SSH 隧道访问

服务器仍按本机模式部署：

```bash
sudo bash v7/deploy/linux/deploy.sh --local
```

在自己的 Windows PowerShell、CMD、macOS Terminal 或 Linux Terminal 中执行一整行：

```bash
ssh -N -L 8007:127.0.0.1:8007 -L 8766:127.0.0.1:8766 user@host
```

保持终端窗口运行，然后在自己的电脑打开：

```text
http://127.0.0.1:8007/v7/app/
```

两个转发都需要保留：8007 提供页面，8766 提供本地模式的行情接口。

### 3.3 云主机公网 IP

让脚本自动检测当前主机的公网 IPv4：

```bash
sudo bash v7/deploy/linux/deploy.sh --public
```

仅在自动检测不符合实际网络拓扑时手工指定：

```bash
sudo bash v7/deploy/linux/deploy.sh --public-ip 43.110.32.34
```

部署完成后使用脚本输出的 HTTPS 地址，例如：

```text
https://43.110.32.34/v7/app/
```

公网模式默认要求 Basic Auth。默认用户名为 `reviewer`；密码由部署过程创建或从指定
的 root-only 密码文件读取，不会打印在终端中。

### 3.4 公网域名

先把域名 A 记录指向服务器公网 IP，再执行：

```bash
sudo bash v7/deploy/linux/deploy.sh \
  --public-domain replay.example.com
```

Caddy 自动申请和续期 HTTPS 证书。DNS 必须已经生效，且外部能够访问 TCP 80/443。

### 3.5 局域网、家庭网络或 VPN 域名

```bash
sudo bash v7/deploy/linux/deploy.sh \
  --private-domain replay.home.arpa
```

私有域名使用 Caddy 内部 CA。每台客户端需要信任服务器上的根证书：

```text
/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt
```

### 3.6 使用已有 DuckDB

默认数据库路径为：

```text
/srv/replay-lab-data/trading_data.duckdb
```

也可以显式指定其他路径：

```bash
sudo bash v7/deploy/linux/deploy.sh --local \
  --db /absolute/path/trading_data.duckdb
```

已有数据库会先校验，再以只读方式提供给 Market Data 服务。数据库不会被复制进
Git 或代码 release，也不会在部署时被自动修复或替换。

### 3.7 重复部署和升级

第一次成功部署后，不需要再次输入主机 IP 或域名：

```bash
cd ~/backtesting-v7
git pull --ff-only origin v7/rebuild
sudo bash v7/deploy/linux/deploy.sh
```

脚本会复用已经保存的访问模式、地址、数据库路径、服务用户和认证配置。若有未提交
的受跟踪源码改动，正式部署会停止，避免把不可追踪代码发布到服务器。

## 4. 第一次配置数据库

如果部署时数据库路径不存在，脚本会自动开启一次性浏览器初始化。不要提前执行
`touch trading_data.duckdb`，空文件不是有效 DuckDB。

打开：

```text
/v7/app/data-acquisition.html
```

按照页面顺序操作：

1. 选择一个 `.csv` 或 `.duckdb` 文件；
2. 点击 `1 · Upload`；
3. 点击 `2 · Validate`；
4. 检查每个品种的数据范围、行数和校验结果；
5. 在确认框准确输入 `ACTIVATE DATABASE`；
6. 点击 `3 · Activate database`。

上传完成但尚未激活时，可以使用 `Upload another file` 丢弃服务端保留的上传任务并
重新选择文件。不要通过 SSH 手工删除 staging 文件。

### 4.1 CSV 格式

CSV 必须为 UTF-8，表头名称和顺序必须完全一致：

```text
instrument,ts,open,high,low,close,volume
```

时间格式：

```text
YYYY-MM-DD HH:MM:SS
```

当前导入器不自动改列名、转换时区、修正类型、合并重复时间戳或规范品种名。格式问题
必须在源文件中处理后重新上传。

### 4.2 DuckDB 格式

DuckDB 必须包含 `main.futures_1m`，字段为：

| 字段 | 类型 |
| --- | --- |
| `instrument` | `VARCHAR` |
| `ts` | `TIMESTAMP` |
| `open` | `DOUBLE` |
| `high` | `DOUBLE` |
| `low` | `DOUBLE` |
| `close` | `DOUBLE` |
| `volume` | `BIGINT` |

重复时间戳是硬错误，不会自动去重。

### 4.3 激活后的限制

数据库激活是一次性原子操作。激活后导入器会永久锁定，不再允许从页面替换数据库。
不要手工删除已经激活的 `/srv/replay-lab-data/trading_data.duckdb`；删除文件不会重新
打开初始化入口，只会让行情服务失去数据。需要迁移或恢复时，应使用已验证的备份。

页面右上角出现 `Optional maintenance disabled` 是正常状态：它表示历史维护、Contract
Roll 等可选写入服务没有启用，不影响已激活数据库的只读回放。

## 5. 创建和管理 Session

打开 `/v7/app/` 后，在 Sessions 页面创建回放任务：

1. 输入 Session 名称；
2. 选择一个或多个可用品种；
3. 选择 Start 和 End 日期；
4. 创建并进入 Session。

日期按纽约时区解释，只展示已选品种确实有数据的日期。CME 周末边界提供星期六简写：

- Start 选星期六，表示随后星期日 18:00（纽约时间）；
- End 选星期六，表示之前星期五 16:59 的可见结束边界。

删除 Session 需要确认。Session 会保存 Replay 光标、窗格数量和比例、每个窗格的品种、
周期、ETH/RTH 和视口位置。

## 6. 回放工作区

### 6.1 图表基本操作

- 按住鼠标拖动：平移时间轴；
- 滚轮：缩放图表；
- 向左拖到历史边界：按需加载更早数据；
- 未来时间轴可以显示，但未来 K 线不会提前泄露；
- 点击某个窗格：将它设为 Active Pane，上方品种和周期操作作用于该窗格；
- 右键某根 K 线：可以让其他窗格定位到同一时间，不会改变 Replay 光标。

窗格右下角可以出现 `Reset View` 和 `Maximize`。它们可在 Settings 中设为始终显示、
悬停显示或隐藏。

### 6.2 多窗格与同步

布局菜单支持 1–4 个窗格，并可拖动分隔条调整比例。每个窗格可以有独立品种、周期和
视口。

当前同步边界：

- Symbol、Interval、Crosshair 可按布局同步设置工作；
- ETH/RTH 是整个 Session 共用的模式；
- 时间位置不做持续强制同步，可用右键定位其他窗格；
- Date-range sync 仍是延后项，当前不可用。

### 6.3 底部 Replay 控制条

底部固定控制条包含：

- 截断选择工具；
- Previous bar；
- Play/Pause；
- 自动播放速度；
- Replay step；
- Next bar；
- “Replay step 跟随 Active Pane 周期”的开关。

Previous/Next 按选定的 Replay step 推进，不一定等于 Active Pane 的周期。打开同步开关
后，Replay step 才会随 Active Pane 周期变化。

截断工具用于选择一根 K 线，并隐藏该 K 线及其后的所有 K 线，之后仍可通过 Replay
推进逐步显示。

### 6.4 顶部导航

- `Restart`：回到 Session 起点；
- `Go to`：按预设的纽约时间锚点向前跳转；
- `Exact`：在 Session 范围内选择精确分钟；
- `Settings`：打开全局工作站显示设置。

Quick GoTo 的时间锚点可在其设置中调整。精确跳转和 Restart 都遵守 Session 数据边界。

### 6.5 Settings

设置按以下类别组织：

- Symbol：价格精度和蜡烛颜色、实体、边框、影线；
- Status line：OHLC、涨跌、成交量和字体；
- Scales and lines：当前价格线、名称/数值、网格、Crosshair、坐标文字；
- Canvas：背景、日期格式、星期显示、12/24 小时制、时区、上下边距和右侧留白。

对话框支持预览、取消和保存。这里的设置是整个工作站共用的，不属于某个单独窗格。

## 7. 不同电脑之间记忆 Session

本机模式使用浏览器本地状态。公网/域名部署会把状态同步到服务器：

- Basic Auth 用户名是状态命名空间；
- 两台电脑使用相同用户名登录，会恢复同一份服务器快照；
- 不同用户名彼此隔离；
- Session、检查点、Replay 光标、导航偏好、工作站设置和颜色历史会同步；
- 行情 K 线、DuckDB、缓存和密码不会进入状态快照。

这不是完整用户系统：没有注册、找回密码、角色权限或组织管理。若两台设备同时修改，
界面会要求明确选择 `Use server` 或 `Keep this device`。离线时继续使用本地状态，网络
恢复后可以重试同步。

服务端状态文件为：

```text
/var/lib/replay-lab/state/replay-lab-state.sqlite3
```

## 8. 数据和备份

需要单独备份两类数据：

- 行情数据库：`/srv/replay-lab-data/trading_data.duckdb`；
- 用户状态：`/var/lib/replay-lab/state/replay-lab-state.sqlite3`。

代码升级不会覆盖这两项。复制 SQLite 状态前应短暂停止 State 服务，避免得到不一致
文件：

```bash
sudo systemctl stop replay-lab-state
sudo cp --preserve=mode,ownership,timestamps \
  /var/lib/replay-lab/state/replay-lab-state.sqlite3 /your/backup/path/
sudo systemctl start replay-lab-state
```

密码文件也应按主机密钥处理并保留 root-only 权限。部署配置
`/etc/replay-lab/deployment.conf` 不含密码，不能代替密码和数据备份。

## 9. 运行状态检查

检查四个应用服务和 Caddy：

```bash
sudo systemctl status \
  replay-lab-market-data replay-lab-state \
  replay-lab-database-import replay-lab-web caddy \
  --no-pager -l
```

检查本机健康接口：

```bash
curl -fsS http://127.0.0.1:8766/v7/market-data/health
curl -fsS http://127.0.0.1:8767/v7/state/health
curl -fsS http://127.0.0.1:8768/v7/database/health
curl -I http://127.0.0.1:8007/v7/app/
sudo caddy validate --config /etc/caddy/Caddyfile
```

查看最近日志：

```bash
sudo journalctl \
  -u replay-lab-market-data \
  -u replay-lab-state \
  -u replay-lab-database-import \
  -u replay-lab-web \
  -n 200 --no-pager
```

## 10. 常见问题

### 页面完全无法加载

先检查 8007 本地页面、四个 systemd 服务和 Caddy。公网主机还要确认云安全组、主机
防火墙和 DNS 允许 80/443。应用服务只监听 loopback 是正确的，不要把它们改成公网
监听。

### `Maintenance API unavailable` 或 `Optional maintenance disabled`

这是可选历史维护写入服务未启用，不是回放 Market Data 服务故障。当前验收部署只读，
此提示不阻止 Session 和 Replay。

### `Import service unavailable`

检查：

```bash
curl -fsS http://127.0.0.1:8768/v7/database/health
sudo journalctl -u replay-lab-database-import -n 200 --no-pager
```

### 上传返回 409 或不能重新上传

服务端仍保留上次任务。使用页面的 `Upload another file` 并确认丢弃，再选择文件。校验
正在进行时，需要等待它完成或恢复到稳定状态。

### Validate 出现 502，日志包含 OOM

512 MB 主机校验约 900 MB DuckDB 时需要 swap。先执行 `free -h`，再拉取当前代码并
重新运行统一部署脚本；脚本会检测并补足所需 swap。仍失败时查看 Import 服务和内核
OOM 日志，不要重复上传同一任务。

### 提示数据库文件不存在

如果数据库从未激活，保留目标路径不存在并重新部署，即可进入浏览器初始化。如果它
已经激活后被手工删除，初始化锁不会自动解除，应从备份恢复数据库。

### Caddy 报 `ambiguous site definition`

当前统一部署会迁移已识别的旧 Replay Lab 配置并消除重复 import。先拉取最新代码，
直接重新执行 `sudo bash v7/deploy/linux/deploy.sh`。如果仍停止，说明该域名/IP 可能由
无法确认归属的 Caddy 站点占用；脚本会故意 fail closed，不会删除其他站点。

### 公网证书无法签发

确认公网 IP/DNS 正确、外部 TCP 80/443 可达，并检查 Caddy 日志。私有域名不申请公网
证书，需要在客户端信任内部 CA。

### 另一台电脑没有之前的 Session

确认两台电脑访问同一服务器、使用完全相同的 Basic Auth 用户名，并检查 State 服务
健康。不同用户名会得到不同状态；本机 `--local` 模式默认只使用浏览器本地身份。

## 11. 安全边界

- 公网只开放 80/443；
- 不在命令行直接写明文密码；
- Market Data 永远只读访问 DuckDB；
- Database Import 只允许首次初始化，不提供任意替换；
- Caddy 对公网写请求实行明确白名单；
- 部署遇到未知 Caddy 站点或监听进程时停止，而不是猜测性覆盖；
- 部署脚本不配置云安全组、不上传数据库、不安装 Databento 凭据。

更详细的部署、回滚和资源策略见
[Linux 部署说明](../deploy/linux/README.md)。开发和架构文档入口见
[V7 文档索引](INDEX.md)，当前人工验收项见
[验收1](../tmp/验收1.md)。
