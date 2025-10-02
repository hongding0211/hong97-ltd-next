# 短链功能使用示例

## 后端API使用

### 1. 创建短链
```bash
curl -X POST http://localhost:3001/shortlink \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "originalUrl": "https://www.google.com/search?q=very+long+search+query+with+many+parameters",
    "title": "Google搜索示例",
    "description": "这是一个很长的Google搜索链接",
    "tags": ["search", "google", "example"]
  }'
```

**响应:**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "shortCode": "abc123",
  "originalUrl": "https://www.google.com/search?q=very+long+search+query+with+many+parameters",
  "title": "Google搜索示例",
  "description": "这是一个很长的Google搜索链接",
  "clickCount": 0,
  "isActive": true,
  "expiresAt": null,
  "createdBy": "user123",
  "tags": ["search", "google", "example"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. 获取短链列表
```bash
curl -X GET "http://localhost:3001/shortlink?page=1&pageSize=10&search=google" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 测试重定向（无需认证）
```bash
curl -X GET http://localhost:3001/shortlink/redirect/abc123
```

**响应:**
```json
{
  "url": "https://www.google.com/search?q=very+long+search+query+with+many+parameters"
}
```

## 前端使用

### 1. 用户访问短链
用户访问: `https://yourdomain.com/s/abc123`

### 2. 中间件处理流程
1. Next.js中间件匹配 `/s/abc123` 格式
2. 提取短码 `abc123`
3. 调用后端API `GET /shortlink/redirect/abc123`
4. 获取原始URL
5. 执行重定向到原始URL

### 3. 错误处理
- 短链不存在 → 重定向到404页面
- 短链已停用 → 重定向到404页面
- 短链已过期 → 重定向到404页面
- API调用失败 → 重定向到404页面

## 短码生成示例

短码生成算法会生成6位小写字母的随机字符串：

```
示例短码:
- abc123
- xyz789
- def456
- ghi012
- jkl345
```

## 环境变量配置

### 后端 (.env)
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=your_database
JWT_SECRET=your_jwt_secret
```

### 前端 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```
