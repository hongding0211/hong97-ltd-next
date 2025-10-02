# 短链模块 API 文档

## 概述
短链模块提供了创建、管理短链接的功能，支持自定义短码、过期时间、标签分类等特性。

## 短码生成算法
- 生成6位小写字母字符串 (a-z)
- 使用 `crypto.getRandomValues()` 确保随机性
- 自动检测冲突并重新生成
- 最大尝试10次，失败后使用UUID转换作为后备方案

## API 接口

### 1. 创建短链
**POST** `/shortlink`

**请求体:**
```json
{
  "originalUrl": "https://example.com/very-long-url",
  "title": "示例标题",
  "description": "示例描述",
  "shortCode": "abc123", // 可选，自定义短码
  "tags": ["tag1", "tag2"], // 可选
  "expiresAt": "2024-12-31T23:59:59Z", // 可选，过期时间
  "isActive": true // 可选，默认true
}
```

**响应:**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very-long-url",
  "title": "示例标题",
  "description": "示例描述",
  "clickCount": 0,
  "isActive": true,
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "createdBy": "user123",
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. 获取短链列表
**GET** `/shortlink?page=1&pageSize=10&search=关键词&tag=标签`

**查询参数:**
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认10，最大100
- `search`: 搜索关键词（标题、描述、URL、短码）
- `tag`: 按标签筛选

**响应:**
```json
{
  "data": [...], // 短链列表
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

### 3. 获取短链详情
**GET** `/shortlink/:id`

**响应:** 同创建短链的响应格式

### 4. 更新短链
**PUT** `/shortlink/:id`

**请求体:** 同创建短链，所有字段可选

**响应:** 同创建短链的响应格式

### 5. 删除短链
**DELETE** `/shortlink/:id`

**响应:** 204 No Content

### 6. 重定向
**GET** `/shortlink/redirect/:shortCode`

**响应:**
```json
{
  "url": "https://example.com/very-long-url"
}
```

## 权限控制
- 只有短链的创建者可以查看、修改、删除自己的短链
- 重定向接口无需认证，但会检查短链状态

## 短链状态检查
- `isActive`: 是否激活
- `expiresAt`: 过期时间（可选）
- 只有激活且未过期的短链才能重定向

## 错误码
- `shortlink.notFound`: 短链不存在
- `shortlink.inactive`: 短链已停用
- `shortlink.expired`: 短链已过期
- `shortlink.unauthorized`: 无权限操作此短链
- `shortlink.shortCodeExists`: 短码已存在
- `shortlink.invalidUrl`: 无效的URL格式
