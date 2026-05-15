## Why

walkcalc 后端迁移时刻意移除了旧 APNs/Bark 副作用，但移动端协作记账仍需要在成员、账单、结算变化后及时同步并提醒相关成员。当前仓库已经有通用 `PushService`、设备注册、APNs provider 和 notification catalog 边界，因此现在可以把 walkcalc 业务事件接到现有推送能力上，而不是重新实现 legacy push。

## What Changes

- 为 walkcalc 定义业务推送事件和接收人规则，覆盖成员变更、记录变更、批量结算和群组解散。
- 在 walkcalc 服务的成功业务写入之后调用内部 `PushService.sendNotification`，推送失败不回滚已经成功的 walkcalc 操作。
- 新增 walkcalc notification catalog types，区分可见 alert 和后台 silent sync：
  - 邀请：给新加入的正式用户可见提醒。
  - 加入群组：给已有正式成员可见提醒，通知谁加入了群组。
  - 账单新增/更新/删除：给被账单影响的正式用户可见提醒，其他正式成员只做后台同步。
  - 批量结算：给转账双方中的正式用户可见提醒，其他正式成员只做后台同步。
  - 群组重命名、添加临时用户：只给正式成员做后台同步。
  - 群组解散：给非操作者正式成员可见提醒。
- 推送只面向当前用户系统里的正式成员；临时用户没有设备注册，不作为推送接收人。
- 避免给触发操作的用户发可见提醒；但允许给其账号发送 silent sync，用于其他设备刷新。
- 保持 `PushService` 为唯一发送边界，不恢复 legacy APNs key、legacy push service 或 Bark side effect。

## Capabilities

### New Capabilities
- `walkcalc-push-notifications`: 定义 walkcalc 业务事件触发推送的时机、接收人、notification type/payload、失败语义和去重规则。

### Modified Capabilities
- 无。现有 `app-push-notifications` 已提供内部 `PushService`、设备注册、APNs provider 和 provider-neutral notification catalog；本变更只新增 walkcalc 业务使用方式和 catalog entries。

## Impact

- Affected backend code:
  - `packages/server/src/modules/walkcalc/*`：在群组和记录写入成功后派发推送。
  - `packages/server/src/modules/push/catalog.ts`：新增 walkcalc alert/silent notification types。
  - `packages/server/src/modules/push/*` tests：补充 walkcalc catalog payload 校验和渲染断言。
  - `packages/server/src/modules/walkcalc/*` tests：补充接收人、失败不阻塞、无设备不报错、临时用户不推送等场景。
- API impact: 不新增公开发送接口；移动端继续通过现有 `/push/devices` 注册设备。
- Configuration impact: walkcalc app 需要通过 `PUSH_APPS_JSON` 配置 `appId`、APNs topic/environment/credentialRef/locales；服务代码通过固定的 walkcalc app id 调用 push。
- Dependency impact: 无新增外部依赖，复用当前 APNs provider。
