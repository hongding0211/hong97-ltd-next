# 短链管理功能

## 功能概述

短链管理功能允许用户创建、管理和跟踪短链接，支持以下特性：

- ✅ 创建短链（支持自定义短码）
- ✅ 编辑短链信息
- ✅ 删除短链
- ✅ 分页查看所有短链
- ✅ 搜索功能（标题、描述、URL、短码）
- ✅ 标签分类
- ✅ 过期时间设置
- ✅ 激活/停用状态
- ✅ 点击统计
- ✅ 一键复制短链
- ✅ 预览短链

## 页面结构

```
/tools/shortlink/
├── index.tsx          # 主页面 - 短链列表和管理
├── test.tsx           # 测试页面
└── README.md          # 说明文档
```

## 使用流程

### 1. 创建短链
1. 访问 `/tools/shortlink`
2. 点击"新建短链"按钮
3. 填写表单：
   - **原始URL** (必填): 要缩短的完整URL
   - **标题** (可选): 短链的显示标题
   - **描述** (可选): 详细描述
   - **自定义短码** (可选): 6位小写字母，不填则自动生成
   - **标签** (可选): 用逗号分隔的标签
   - **过期时间** (可选): 短链失效时间
   - **激活状态**: 是否启用该短链

### 2. 管理短链
- **查看**: 在列表中查看所有短链信息
- **搜索**: 使用搜索框按标题、描述、URL或短码搜索
- **编辑**: 点击编辑按钮修改短链信息
- **删除**: 点击删除按钮移除短链
- **复制**: 点击复制按钮复制短链URL
- **预览**: 点击外部链接按钮在新窗口打开短链

### 3. 短链格式
- 短链URL格式: `https://yourdomain.com/s/{shortCode}`
- 短码格式: 6位小写字母 (a-z)
- 示例: `https://yourdomain.com/s/abc123`

## 技术实现

### 前端
- **框架**: Next.js + React
- **UI组件**: 自定义UI组件库
- **状态管理**: React Hooks
- **国际化**: next-i18next
- **HTTP客户端**: 自定义http服务

### 后端
- **框架**: NestJS
- **数据库**: MongoDB + Mongoose
- **认证**: JWT
- **API**: RESTful API

### 重定向处理
- **中间件**: Next.js middleware
- **路径匹配**: `/s/{6位小写字母}`
- **API调用**: 调用后端重定向接口
- **错误处理**: 失败时重定向到404页面

## API接口

### 创建短链
```typescript
POST /shortlink
{
  "originalUrl": "https://example.com",
  "title": "示例标题",
  "description": "示例描述",
  "shortCode": "abc123", // 可选
  "tags": ["tag1", "tag2"], // 可选
  "expiresAt": "2024-12-31T23:59:59Z", // 可选
  "isActive": true // 可选
}
```

### 获取短链列表
```typescript
GET /shortlink?page=1&pageSize=10&search=关键词&tag=标签
```

### 更新短链
```typescript
PUT /shortlink/:id
{
  "title": "新标题",
  "isActive": false
  // ... 其他字段
}
```

### 删除短链
```typescript
DELETE /shortlink/:id
```

### 重定向
```typescript
GET /shortlink/redirect/:shortCode
// 返回: { "url": "https://example.com" }
```

## 环境变量

```env
# 前端
NEXT_PUBLIC_BASE_URL=http://localhost:3001

# 后端
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=your_jwt_secret
```

## 权限控制

- 只有登录用户才能访问短链管理页面
- 用户只能管理自己创建的短链
- 重定向接口无需认证，但会检查短链状态

## 错误处理

- **短链不存在**: 重定向到404页面
- **短链已停用**: 重定向到404页面
- **短链已过期**: 重定向到404页面
- **API调用失败**: 重定向到404页面
- **无效URL**: 显示错误提示
- **短码冲突**: 显示错误提示

## 开发测试

访问 `/tools/shortlink/test` 页面进行API测试，可以测试创建和获取短链的功能。
