# TimeFormatModule 快速使用指南

## 1. 最简单的用法

```html
<!DOCTYPE html>
<html>
<head>
  <script src="modules/time_format_module.js"></script>
</head>
<body>
  <input type="text" id="timeInput" />

  <script>
    // 一行代码搞定
    TimeFormatModule.init(['timeInput']);
  </script>
</body>
</html>
```

## 2. 在 V3 项目中使用

### 修改 kline_viewer.html

**步骤 1: 引入模块**
```html
<!-- 在 </head> 之前添加 -->
<script src="../modules/time_format_module.js"></script>
```

**步骤 2: 删除原有的 formatTimeInput 函数**
```javascript
// 删除这个函数
function formatTimeInput(value) {
  // ...
}
```

**步骤 3: 使用模块初始化**
```javascript
function initEventListeners() {
  // 使用模块初始化时间输入框
  TimeFormatModule.init(['startInput', 'endInput'], {
    onEnterCallback: loadKlineData
  });

  // 加载按钮
  document.getElementById('loadBtn').addEventListener('click', loadKlineData);

  // 其他事件...
}
```

## 3. 常用场景

### 场景 1: 只在失焦时格式化

```javascript
TimeFormatModule.init(['timeInput'], {
  onBlur: true,
  onEnter: false
});
```

### 场景 2: 回车时格式化并执行操作

```javascript
TimeFormatModule.init(['startInput', 'endInput'], {
  onEnterCallback: () => {
    console.log('时间已格式化，开始加载数据');
    loadData();
  }
});
```

### 场景 3: 手动格式化

```javascript
const input = document.getElementById('timeInput');
const formatted = TimeFormatModule.format(input.value);
input.value = formatted;
```

### 场景 4: 获取时间戳

```javascript
const timeStr = '2012-01-09 09:30';
const timestamp = TimeFormatModule.toTimestamp(timeStr);
console.log(timestamp); // 1326106200
```

## 4. 完整示例

```html
<!DOCTYPE html>
<html>
<head>
  <script src="modules/time_format_module.js"></script>
</head>
<body>
  <input type="text" id="startInput" placeholder="开始时间" />
  <input type="text" id="endInput" placeholder="结束时间" />
  <button id="loadBtn">加载</button>

  <script>
    // 初始化时间输入框
    TimeFormatModule.init(['startInput', 'endInput'], {
      onEnterCallback: loadData
    });

    // 加载按钮
    document.getElementById('loadBtn').addEventListener('click', loadData);

    function loadData() {
      const start = document.getElementById('startInput').value;
      const end = document.getElementById('endInput').value;

      if (!start || !end) {
        alert('请输入时间');
        return;
      }

      console.log('加载数据:', start, end);
      // 实际的数据加载逻辑...
    }
  </script>
</body>
</html>
```

## 5. 测试

访问测试页面：
```
http://127.0.0.1:8000/v3/modules/test.html
```

## 6. API 速查

| API | 说明 | 示例 |
|-----|------|------|
| `format(value)` | 格式化字符串 | `format('201201090930')` |
| `init(inputs, options)` | 批量初始化 | `init(['id1', 'id2'])` |
| `bindInput(input, options)` | 绑定单个输入框 | `bindInput(element)` |
| `parse(formatted)` | 解析时间字符串 | `parse('2012-01-09 09:30')` |
| `toDate(formatted)` | 转换为 Date | `toDate('2012-01-09 09:30')` |
| `toTimestamp(formatted)` | 转换为时间戳 | `toTimestamp('2012-01-09 09:30')` |

## 7. 配置选项

```javascript
{
  onBlur: true,              // 失焦时格式化
  onEnter: true,           // 回车时格式化
  onEnterCallback: function  // 回车后的回调函数
}
```

## 8. 文件位置

```
v3/
├── modules/
│   ├── time_format_module.js  # 模块文件
│   ├── README.md            # 完整文档
│   ├── QUICK_START.md         # 本文件
│   └── test.html          # 测试页面
└── docs/
    └── kline_viewer.html      # 使用模块的页面
```
