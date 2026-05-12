# 时间格式化模块 (TimeFormatModule)

## 功能说明

自动将 12 位数字格式化为标准时间格式的可复用模块。

**输入格式：** `YYYYMMDDHHNN` (12 位数字)  
**输出格式：** `YYYY-MM-DD HH:NN`

## 快速开始

### 1. 引入模块

```html
<script src="modules/time_format_module.js"></script>
```

### 2. 初始化输入框

```javascript
// 方式 1: 通过 ID 数组初始化
TimeFormatModule.init(['startInput', 'endInput']);
// 方式 2: 通过元素数组初始化
const inputs = document.querySelectorAll('.time-input');
TimeFormatModule.init(Array.from(inputs));

// 方式 3: 带回调函数
TimeFormatModule.init(['startInput', 'endInput'], {
  onEnterCallback: (formatted) => {
    console.log('格式化完成:', formatted);
    loadData(); // 加载数据
  }
});
```

### 3. 手动格式化

```javascript
const result = TimeFormatModule.format('201201090930');
console.log(result); // "2012-01-09 09:30"
```

## API 文档

### TimeFormatModule.format(value)

格式化时间字符串。

**参数：**
- `value` (string) - 输入值

**返回：**
- (string) - 格式化后的值

**示例：**
```javascript
TimeFormatModule.format('201201090930');  // "2012-01-09 09:30"
TimeFormatModule.format('20120109');      // "20120109" (不变，位数不对)
TimeFormatModule.format('201213010930');  // "201213010930" (不变，月份无效)
```

### TimeFormatModule.init(inputs, options)

批量初始化输入框。

**参数：**
- `inputs` (Array) - 输入框 ID 数组或元素数组
- `options` (Object) - 配置选项
  - `onBlur` (boolean) - 失焦时格式化，默认 `true`
  - `onEnter` (boolean) - 回车时格式化，默认 `true`
  - `onEnterCallback` (function) - 回车后的回调函数

**示例：**
```javascript
// 基础用法
TimeFormatModule.init(['startInput', 'endInput']);

// 自定义配置
TimeFormatModule.init(['startInput', 'endInput'], {
  onBlur: true,
  onEnter: true,
  onEnterCallback: (formatted) => {
    console.log('格式化完成:', formatted);
  }
});

// 只在失焦时格式化
TimeFormatModule.init(['startInput'], {
  onBlur: true,
  onEnter: false
});
```

### TimeFormatModule.bindInput(input, options)

为单个输入框绑定格式化事件。

**参数：**
- `input` (HTMLInputElement) - 输入框元素
- `options` (Object) - 配置选项（同 init）

**示例：**
```javascript
const input = document.getElementById('startInput');
TimeFormatModule.bindInput(input, {
  onEnterCallback: loadData
});
```

### TimeFormatModule.parse(formatted)

解析格式化后的时间字符串。

**参数：**
- `formatted` (string) - 格式化后的时间字符串

**返回：**
- (Object|null) - `{ year, month, day, hour, minute }` 或 `null`

**示例：**
```javascript
const parsed = TimeFormatModule.parse('2012-01-09 09:30');
console.log(parsed);
// { year: '2012', month: '01', day: '09', hour: '09', minute: '30' }
```

### TimeFormatModule.toDate(formatted)

转换为 Date 对象。

**参数：**
- `formatted` (string) - 格式化后的时间字符串
**返回：**
- (Date|null) - Date 对象或 `null`

**示例：**
```javascript
const date = TimeFormatModule.toDate('2012-01-09 09:30');
console.log(date); // Date 对象
```

### TimeFormatModule.toTimestamp(formatted)

转换为 Unix 时间戳（秒）。

**参数：**
- `formatted` (string) - 格式化后的时间字符串

**返回：**
- (number|null) - Unix 时间戳或 `null`

**示例：**
```javascript
const timestamp = TimeFormatModule.toTimestamp('2012-01-09 09:30');
console.log(timestamp); // 1326106200
```

## 使用示例

### 示例 1: 基础用法

```html
<!DOCTYPE html>
<html>
<head>
  <script src="modules/time_format_module.js"></script>
</head>
<body>
  <input type="text" id="startInput" placeholder="输入: 201201090930" />
  <input type="text" id="endInput" placeholder="输入: 201201091600" />

  <script>
    // 初始化
    TimeFormatModule.init(['startInput', 'endInput']);
  </script>
</body>
</html>
```

### 示例 2: 带回调函数

```javascript
TimeFormatModule.init(['startInput', 'endInput'], {
  onEnterCallback: (formatted) => {
    console.log('时间已格式化:', formatted);
    
    // 加载数据
    const start = document.getElementById('startInput').value;
    const end = document.getElementById('endInput').value;
    
    if (start && end) {
      loadKlineData(start, end);
    }
  }
});
```

### 示例 3: 手动格式化和验证

```javascript
function validateAndFormat() {
  const input = document.getElementById('timeInput');
  const value = input.value.trim();
  
  // 格式化
  const formatted = TimeFormatModule.format(value);
  
  // 检查是否成功格式化
  if (formatted !== value) {
    input.value = formatted;
    console.log('格式化成功');
    
    // 转换为时间戳
    const timestamp = TimeFormatModule.toTimestamp(formatted);
    console.log('时间戳:', timestamp);
  } else {
    console.log('格式不正确');
  }
}
```

### 示例 4: 动态添加输入框
```javascript
function addTimeInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'time-input';
  document.body.appendChild(input);
  
  // 绑定格式化功能
  TimeFormatModule.bindInput(input);
}
```

## 在 V3 项目中使用

### 修改 kline_viewer.html

```html
<!-- 引入模块 -->
<script src="../modules/time_format_module.js"></script>

<script>
  // 删除原有的 formatTimeInput 函数
  // 使用模块替代

  function initEventListeners() {
    // 初始化时间格式化
    TimeFormatModule.init(['startInput', 'endInput'], {
      onEnterCallback: loadKlineData
    });

    // 加载按钮
    document.getElementById('loadBtn').addEventListener('click', loadKlineData);

    // 周期选择
    document.getElementById('tfSelect').addEventListener('change', () => {
      const start = document.getElementById('startInput').value.trim();
      const end = document.getElementById('endInput').value.trim();
      if (start && end) {
        loadKlineData();
      }
    });
  }
</script>
```

## 验证规则

模块会验证以下内容：

- ✅ 必须是 12 位数字
- ✅ 月份：1-12
- ✅ 日期：1-31
- ✅ 小时：0-23
- ✅ 分钟：0-59

如果不符合规则，返回原输入值。

## 扩展功能

### 支持更多格式

可以扩展 `format` 函数支持更多输入格式：

```javascript
function format(value) {
  const digits = value.replace(/\D/g, '');
  
  // 12 位：YYYYMMDDHHNN
  if (digits.length === 12) {
    // 当前实现
  }
  
  // 8 位：YYYYMMDD (补充 00:00)
  if (digits.length === 8) {
    return `${digits.substring(0,4)}-${digits.substring(4,6)}-${digits.substring(6,8)} 00:00`;
  }
  
  return value;
}
```

### 添加时区支持

```javascript
function toTimestamp(formatted, timezone = 'UTC') {
  const date = toDate(formatted);
  if (!date) return null;
  
  // 根据时区调整
  // ...
}
```

## 测试

### 单元测试示例

```javascript
// 测试格式化
console.assert(
  TimeFormatModule.format('201201090930') === '2012-01-09 09:30',
  '格式化测试失败'
);

// 测试无效输入
console.assert(
  TimeFormatModule.format('20120109') === '20120109',
  '无效输入测试失败'
);

// 测试解析
const parsed = TimeFormatModule.parse('2012-01-09 09:30');
console.assert(
  parsed.year === '2012' && parsed.month === '01',
  '解析测试失败'
);

// 测试时间戳
const timestamp = TimeFormatModule.toTimestamp('2012-01-09 09:30');
console.assert(
  typeof timestamp === 'number',
  '时间戳测试失败'
);
```

## 版本历史

### v1.0.0 (2026-05-12)
- ✅ 基础格式化功能
- ✅ 失焦和回车事件绑定
- ✅ 批量初始化
- ✅ 解析和转换功能
- ✅ 回调函数支持

## 许可

MIT License

## 相关文档

- [V3 项目文档](../README.md)
- [时间格式化功能说明](../TIME_FORMAT_FEATURE.md)
- [调试指南](../DEBUG_TIME_FORMAT.md)
