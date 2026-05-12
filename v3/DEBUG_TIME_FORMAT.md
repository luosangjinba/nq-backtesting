# 时间格式化功能调试指南

## 问题排查

### 1. 测试独立功能

打开测试页面验证格式化函数本身是否工作：

```bash
# 访问测试页面
http://127.0.0.1:8000/v3/docs/test_format.html
```

**测试步骤：**
1. 在"测试 1"输入框输入：`201201090930`
2. 点击外部（失焦）
3. 查看是否转换为：`2012-01-09 09:30`

如果测试页面工作正常，说明格式化函数本身没问题。

### 2. 检查浏览器控制台

打开主页面：
```bash
http://127.0.0.1:8000/v3/docs/kline_viewer.html
```

按 F12 打开开发者工具，查看 Console 标签：

**预期输出：**
```
=== V3 K线查看器启动 ===
✓ 图表初始化完成
✓ 事件监听初始化完成
✓ 应用初始化完成
```

**如果有错误：**
- 红色错误信息会显示具体问题
- 记录错误信息

### 3. 手动测试格式化函数

在浏览器控制台直接测试：

```javascript
// 测试格式化函数
formatTimeInput('201201090930')
// 预期输出: "2012-01-09 09:30"

formatTimeInput('20120109')
// 预期输出: "20120109" (不变，因为只有 8 位)

formatTimeInput('201213010930')
// 预期输出: "201213010930" (不变，因为月份 13 无效)
```

### 4. 检查事件绑定

在控制台测试事件是否绑定：

```javascript
// 获取输入框
const input = document.getElementById('startInput');

// 检查是否存在
console.log('输入框:', input);

// 手动触发格式化
input.value = '201201090930';
input.dispatchEvent(new Event('blur'));
console.log('格式化后:', input.value);
```

### 5. 常见问题

#### 问题 1: 输入框没有反应
**可能原因：**
- JavaScript 加载失败
- 事件监听未绑定
- 输入框 ID 不匹配

**解决方案：**
```javascript
// 检查输入框是否存在
console.log(document.getElementById('startInput'));
console.log(document.getElementById('endInput'));
```

#### 问题 2: 格式化函数未定义
**可能原因：**
- 函数定义在事件绑定之后
- JavaScript 语法错误

**解决方案：**
```javascript
// 检查函数是否存在
console.log(typeof formatTimeInput);
// 应该输出: "function"
```
#### 问题 3: 失焦不触发
**可能原因：**
- 事件监听器未正确绑定
- 浏览器兼容性问题

**解决方案：**
```javascript
// 手动绑定测试
const input = document.getElementById('startInput');
input.addEventListener('blur', (e) => {
  console.log('失焦触发，原值:', e.target.value);
  e.target.value = formatTimeInput(e.target.value.trim());
  console.log('格式化后:', e.target.value);
});
```

## 调试步骤

### Step 1: 验证测试页面
```bash
http://127.0.0.1:8000/v3/docs/test_format.html
```
- ✅ 如果工作：格式化函数正常
- ❌ 如果不工作：格式化函数有问题

### Step 2: 检查主页面控制台
```bash
http://127.0.0.1:8000/v3/docs/kline_viewer.html
```
- 按 F12 打开控制台
- 查看是否有红色错误
- 查看是否有"✓ 事件监听初始化完成"

### Step 3: 手动测试
在控制台输入：
```javascript
formatTimeInput('201201090930')
```
- ✅ 如果返回 `"2012-01-09 09:30"`：函数正常
- ❌ 如果报错：函数未定义或有错误

### Step 4: 测试事件绑定
在控制台输入：
```javascript
const input = document.getElementById('startInput');
input.value = '201201090930';
input.blur();
console.log(input.value);
```
- ✅ 如果输出 `"2012-01-09 09:30"`：事件绑定正常
- ❌ 如果输出 `"201201090930"`：事件未绑定

## 可能的问题和解决方案

### 问题：输入中文输入法的数字
**现象：** 输入 `２０１２０１０９０９３０` (全角数字)
**原因：** `replace(/\D/g, '')` 会移除全角数字
**解决：** 先转换全角为半角

```javascript
function formatTimeInput(value) {
  // 转换全角数字为半角
  value = value.replace(/[０-９]/g, (ch) => 
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  
  const digits = value.replace(/\D/g, '');
  // ... 其余代码
}
```

### 问题：输入时自动补全
**现象：** 浏览器自动补全历史输入
**解决：** 添加 `autocomplete="off"`

```html
<input type="text" id="startInput" autocomplete="off" />
```

### 问题：移动端键盘
**现象：** 移动端弹出字母键盘
**解决：** 使用 `inputmode="numeric"`

```html
<input type="text" id="startInput" inputmode="numeric" />
```

## 请提供以下信息

如果问题仍然存在，请提供：

1. **浏览器控制台截图** - 显示所有错误信息
2. **测试页面结果** - test_format.html 是否工作
3. **手动测试结果** - 在控制台执行 `formatTimeInput('201201090930')` 的结果
4. **具体现象** - 
   - 输入什么内容？
   - 失焦后显示什么？
   - 有没有任何变化？

## 快速修复

如果以上都不行，可以尝试最简单的实现：

```javascript
// 在输入框上直接绑定
document.getElementById('startInput').onblur = function() {
  const v = this.value.replace(/\D/g, '');
  if (v.length === 12) {
    this.value = v.substring(0,4) + '-' + v.substring(4,6) + '-' + 
         v.substring(6,8) + ' ' + v.substring(8,10) + ':' + v.substring(10,12);
  }
};
```
