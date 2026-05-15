## Context

当前分支已经有通用 `PushModule`：移动端通过 `/push/devices` 把 APNs device token 绑定到当前登录用户，业务模块通过 `PushService.sendNotification({ appId, recipientId, type, payload })` 发送 typed notification。`PushService` 会按 `appId + recipientId` 查找 enabled devices，处理 APNs provider、locale、payload 渲染、invalid token disable 和 per-device result。

walkcalc 后端业务在 `migrate-walkcalc-server` / `feat/walkcalc-native` 分支中已经迁移为 NestJS `WalkcalcModule`。该迁移版目前明确排除了 push side effect：创建/加入/邀请/记录变更只改 MongoDB group aggregate，不调用 APNs、Bark 或 legacy push。walkcalc group 中只有正式成员有当前系统 `userId`；临时用户只有 group-local uuid，不能注册设备，也不能作为 push recipient。

## Goals / Non-Goals

**Goals:**
- 复用现有 `PushService`，给 walkcalc 增加业务推送，不新增公开发送 API。
- 明确每个 walkcalc 事件的可见提醒接收人和后台同步接收人。
- 将推送放在业务写入成功之后执行，保证推送失败不会回滚记账、成员或群组操作。
- 给 notification catalog 增加 walkcalc alert/silent types，payload 以 `groupCode`、`recordId`、`actorUserId`、`updateKind` 等稳定业务字段为主。
- 覆盖正式成员、临时用户、操作者、多设备、无设备、provider 失败等测试场景。

**Non-Goals:**
- 不恢复 legacy walkcalc APNs provider、legacy APNs key、Bark 推送或旧服务路由。
- 不实现通知偏好、免打扰、已读状态、通知中心列表或客户端 badge 计数。
- 不新增 Android/FCM。
- 不改变 walkcalc group/record API 响应契约。
- 不把推送作为业务操作成功的前置条件。

## Decisions

1. **用 walkcalc 内部 dispatcher 封装业务事件到 PushService 的映射。**
   - Decision: 在 walkcalc 模块内引入类似 `WalkcalcPushService` 的小型编排服务，`WalkcalcService` 在 mutation 成功后传入 actor、group 快照、事件类型和 record/transfer 上下文，由 dispatcher 计算接收人并调用 `PushService`。
   - Rationale: walkcalc 业务服务不应该散落 notification type 字符串、接收人去重和 alert/silent 分流逻辑；通用 push 模块也不应该理解 walkcalc 的成员/账单语义。
   - Alternative considered: 直接在每个 walkcalc 方法中调用 `PushService`。这会让接收人规则分散，后续 review 容易漏掉 temp user、自推送和重复推送边界。

2. **可见 alert 与 silent sync 分层。**
   - Decision: 每次业务变更先计算 alert recipients；同一事件中已收到 alert 的用户不再额外收到 silent sync，因为 alert payload 也包含刷新所需 data。未收到 alert 但需要刷新状态的正式成员收到 `walkcalc.sync.requested`。
   - Rationale: 账本是协作数据，非直接相关成员也需要刷新列表或 group detail；但所有事件全员 alert 噪声过高。
   - Alternative considered: 只发 alert，不发 silent。这样未被账单直接影响的成员无法及时刷新 group modified time 和记录列表。另一个方案是全员 alert，噪声不可控。

3. **可见提醒不发给操作者，但 silent sync 可以发给操作者账号。**
   - Decision: alert recipients 永远排除 `actorUserId`；silent sync recipients 可包含 actor，用于同账号其他设备刷新。
   - Rationale: 触发 API 的当前设备已经知道操作结果，不需要可见提醒；但 `PushService` 以 user recipient 发送，无法排除当前设备且保留其他设备，所以 silent sync 是更合理的折中。
   - Alternative considered: 完全不给 actor 发任何推送。这样 actor 的其他设备会落后，除非客户端额外轮询。

4. **只给正式成员推送，临时用户只参与影响范围计算。**
   - Decision: payer、forWhom、transfer from/to 中的临时用户可影响“这条账单涉及哪些人”的计算，但最终 recipient 只保留 group.members 里的正式 `userId`。
   - Rationale: 临时用户没有当前登录身份和 device registration；将 uuid 传给 `PushService` 只会产生无意义的 no-destination。
   - Alternative considered: 允许向任意 participant id 发送。该方案会把 temp uuid 和 userId 混在 recipient 层，难以测试和排错。

5. **推送在持久化成功之后 best-effort 执行。**
   - Decision: group/record mutation save 或 transaction commit 完成后再派发推送；捕获 `PushService` 的错误并记录日志，不向客户端返回失败。
   - Rationale: walkcalc 的核心数据一致性比通知送达更重要；APNs 或设备注册异常不应让记账失败。
   - Alternative considered: 在同一 transaction 内等待推送成功。外部 provider 无法参与 Mongo transaction，并会把 APNs 延迟带入核心 API。

6. **notification type 使用 walkcalc 命名空间和稳定 payload。**
   - Decision: 新增 `walkcalc.group.invited`、`walkcalc.group.member-joined`、`walkcalc.group.dismissed`、`walkcalc.record.created`、`walkcalc.record.updated`、`walkcalc.record.deleted`、`walkcalc.debts.resolved`、`walkcalc.sync.requested`。
   - Rationale: 类型名表达业务含义，客户端可以按 type 做跳转；payload 中保留 `groupCode`、`groupName`、`actorUserId`、`actorName`、`recordId`、`updateKind`、`affectedUserIds` 等 provider-neutral 字段。
   - Alternative considered: 复用 generic `system.announcement` 或 `sync.requested`。这会丢失业务语义，客户端无法可靠跳到 group 或 record。

## Risks / Trade-offs

- [Risk] walkcalc 模块和 push 模块当前在不同分支上，集成时可能出现 import/module 合并冲突。-> Mitigation: 保持本提案只定义边界；实现时先确认 WalkcalcModule 已合入当前 push branch，再接入 `PushModule` export 的 `PushService`。
- [Risk] alert/silent 分流规则可能仍偏吵或偏静。-> Mitigation: 先按“直接影响者 alert，其他成员 silent”实现，后续再加用户通知偏好。
- [Risk] mutation 后异步推送可能读取不到旧记录上下文。-> Mitigation: update/delete/resolve 在修改前保存必要旧 record 或 transfer context，用该上下文计算 recipients。
- [Risk] `PushService.sendNotification` 按用户发送到所有设备，无法排除当前设备。-> Mitigation: 对 actor 只发 silent sync，不发 alert；客户端收到 silent 后自行幂等刷新。
- [Risk] provider failure 被吞掉会降低可观测性。-> Mitigation: dispatcher 汇总 per-recipient result 并记录 warning/error，测试只要求不阻塞业务。
