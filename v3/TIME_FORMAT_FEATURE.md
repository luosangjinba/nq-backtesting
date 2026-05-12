# 时间输入自动格式化功能

## 功能说明

在开始时间/结束时间输入框中输入 12 位数字，失焦或按回车后自动格式化为标准格式。

## 格式转换

**输入格式：** `YYYYMMDDHHNN` (12 位数字)
**输出格式：** `YYYY-MM-DD HH:NN`

### 示例

| 输入 | 输出 |
|------|------|
| `201201090930` | `2012-01-09 09:30` |
| `201201091600` | `2012-01-09 16:00` |
| `202605111430` | `2026-05-11 14:30` |

## 触发时机

1. **失焦时** - 点击输入框外部
2. **回车时** - 按下 Enter 键

## 验证规则

- 必须是 12 位数字
- 月份：1-12
- 日期：1-31
- 小时：0-23
- 分钟：0-59

如果不符合规则，保持原输入不变。

## 实现代码

```javascript
function formatTimeInput(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) return value;
  
  const year = digits.substring(0, 4);
  const month = digits.substring(4, 6);
  const day = digits.substring(6, 8);
  const hour = digits.substring(8, 10);
  const minute = digits.substring(10, 12);
  
  // 验证
  if (parseInt(month) < 1 || parseInt(month) > 12) return value;
  if (parseInt(day) < 1 || parseInt(day) > 31) return value;
  if (parseInt(hour) > 23) return value;
  if (parseInt(minute) > 59) return value;
  
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

// 绑定事件
['startInput', 'endInput'].forEach(id => {
  const input = document.getElementById(id);
  
  // 失焦时格式化
  input.addEventListener('blur', (e) => {
    e.target.value = formatTimeInput(e.target.value.trim());
  });
  
  // 回车时格式化并加载
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.target.value = formatTimeInput(e.target.value.trim());
      loadKlineData();
    }
  });
});
```

## 测试步骤

1. **启动服务**
   ```bash
   cd /home/leo/myworkspace/trading/backtesting
   bash v3/test.sh
   ```

2. **打开浏览器**
   http://127.0.0.1:8000/v3/docs/kline_viewer.html

3. **测试失焦格式化**
   - 在"开始时间"输入框输入：`201201090930`
   - 点击输入框外部（失焦）
   - 验证：自动转换为 `2012-01-09 09:30`

4. **测试回车格式化**
   - 在"结束时间"输入框输入：`201201091600`
   - 按下 Enter 键
   - 验证：自动转换为 `2012-01-09 16:00` 并加载数据

5. **测试无效输入**
   - 输入：`20120109` (只有 8 位)
   - 失焦后：保持原样，不转换
   - 输入：`201213010930` (月份 13，无效)
   - 失焦后：保持原样，不转换

## 用户体验

### 优点
- ✅ 快速输入，无需输入分隔符
- ✅ 自动格式化，减少输入错误
- ✅ 支持失焦和回车两种触发方式

### 注意事项
- 必须输入完整的 12 位数字
- 不支持部分输入（如 8 位日期）
- 无效输入会保持原样

## 扩展功能（可选）

### 支持更多格式

```javascript
function formatTimeInput(value) {
  const digits = value.replace(/\D/g, '');
  
  // 12 位：YYYYMMDDHHNN
  if (digits.length === 12) {
    // ... 当前实现
  }
  
  // 8 位：YYYYMMDD (自动补充 00:00)
  if (digits.length === 8) {
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    return `${year}-${month}-${day} 00:00`;
  }
  
  return value;
}
```

### 智能补全

```javascript
// 输入 20120109 -> 2012-01-09 09:30 (补充当前时间)
// 输入 0930 -> 2012-01-09 09:30 (补充当前日期)
```

## 当前状态

✅ 基础功能已实现
✅ 失焦格式化已实现
✅ 回车格式化已实现
✅ 输入验证已实现

可以开始测试了！
