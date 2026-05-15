# walkcalc-push-notifications Specification

## Purpose
Define how walkcalc backend mutations use the internal app push service to notify formal group members while keeping push provider details out of walkcalc business logic.

## Requirements
### Requirement: Walkcalc uses the internal push service
The system SHALL send walkcalc notifications through the existing internal `PushService` and SHALL NOT invoke legacy APNs, Bark, or externally exposed notification sending APIs from walkcalc flows.

#### Scenario: Push service is used after successful mutation
- **WHEN** a walkcalc group or record mutation succeeds and requires notification
- **THEN** the system calls `PushService.sendNotification` with the configured walkcalc `appId`, recipient user ID, notification type, and typed payload

#### Scenario: Legacy push is not restored
- **WHEN** walkcalc push notifications are implemented
- **THEN** the system does not add legacy walkcalc APNs providers, legacy APNs keys, Bark calls, or public notification-send endpoints for walkcalc

#### Scenario: Push failure does not fail business operation
- **WHEN** a walkcalc mutation succeeds but push delivery returns `no-destination`, provider rejection, or throws an error
- **THEN** the original walkcalc API response remains successful
- **AND** the system records or logs the push failure for diagnostics

### Requirement: Walkcalc group events notify the correct recipients
The system SHALL map walkcalc group membership and metadata events to visible alerts or silent sync notifications based on formal group membership and actor identity.

#### Scenario: Creating a group sends no push
- **WHEN** an authenticated user creates a walkcalc group
- **THEN** no walkcalc push notification is sent

#### Scenario: Inviting formal users sends visible alerts to newly invited users
- **WHEN** a group member invites current users who are not already members
- **THEN** each newly invited formal user except the actor receives a visible `walkcalc.group.invited` notification
- **AND** existing formal members who did not receive the visible alert receive at most one `walkcalc.sync.requested` notification for the group update

#### Scenario: Joining by code alerts existing members
- **WHEN** a formal user joins a group by join code
- **THEN** existing formal members except the joining actor receive a visible `walkcalc.group.member-joined` notification
- **AND** formal members who did not receive the visible alert receive at most one `walkcalc.sync.requested` notification for the group update

#### Scenario: Adding a temporary user only syncs formal members
- **WHEN** a group owner adds a temporary user
- **THEN** formal members receive `walkcalc.sync.requested`
- **AND** the temporary user is not used as a push recipient

#### Scenario: Renaming a group only syncs formal members
- **WHEN** a group owner renames a group
- **THEN** formal members receive `walkcalc.sync.requested`
- **AND** no visible walkcalc alert is sent for the rename

#### Scenario: Archiving is local to one user
- **WHEN** a user archives or unarchives a walkcalc group
- **THEN** no walkcalc push notification is sent

#### Scenario: Dismissing a group alerts other members
- **WHEN** a group owner dismisses a group
- **THEN** non-actor formal members receive a visible `walkcalc.group.dismissed` notification
- **AND** temporary users and the actor do not receive a visible dismissal alert

### Requirement: Walkcalc record events notify affected formal users
The system SHALL send visible alerts for walkcalc record changes to affected formal participants and SHALL use silent sync for other formal members that need group state refresh.

#### Scenario: Adding a record alerts affected formal participants
- **WHEN** a group member adds a walkcalc record
- **THEN** formal users appearing as the payer or in `forWhom`, excluding the actor, receive a visible `walkcalc.record.created` notification
- **AND** other formal group members receive at most one `walkcalc.sync.requested` notification

#### Scenario: Updating a record alerts the union of old and new affected formal participants
- **WHEN** a group member updates a non-debt-resolution walkcalc record
- **THEN** formal users appearing as payer or `forWhom` in either the previous record or updated record, excluding the actor, receive a visible `walkcalc.record.updated` notification
- **AND** other formal group members receive at most one `walkcalc.sync.requested` notification

#### Scenario: Deleting a record alerts users affected by the deleted record
- **WHEN** a group member deletes a walkcalc record
- **THEN** formal users appearing as the payer or in `forWhom` on the deleted record, excluding the actor, receive a visible `walkcalc.record.deleted` notification
- **AND** other formal group members receive at most one `walkcalc.sync.requested` notification

#### Scenario: Resolving debts alerts formal transfer participants
- **WHEN** a group member bulk resolves debts
- **THEN** formal users appearing as `from` or `to` in the accepted transfers, excluding the actor, receive a visible `walkcalc.debts.resolved` notification
- **AND** other formal group members receive at most one `walkcalc.sync.requested` notification

#### Scenario: Temporary participants are not recipients
- **WHEN** a record or debt-resolution event involves only temporary users besides the actor
- **THEN** temporary participant IDs are ignored for push recipient selection
- **AND** formal members still receive silent sync when group state changes

### Requirement: Walkcalc notification payloads are typed and provider-neutral
The system SHALL define walkcalc notification catalog entries with provider-neutral payload fields that clients can use to refresh or deep-link without knowing APNs payload details.

#### Scenario: Visible group notification payload
- **WHEN** the system sends a visible walkcalc group notification
- **THEN** the payload includes `groupCode`, `groupName`, `actorUserId`, `actorName`, and an event-specific `updateKind`

#### Scenario: Visible record notification payload
- **WHEN** the system sends a visible walkcalc record notification
- **THEN** the payload includes `groupCode`, `groupName`, `actorUserId`, `actorName`, `recordId` when applicable, `updateKind`, and affected formal user IDs when applicable

#### Scenario: Silent sync payload
- **WHEN** the system sends `walkcalc.sync.requested`
- **THEN** the payload includes `syncId`, `groupCode`, and `updateKind`
- **AND** the push mode is silent/background

#### Scenario: Catalog rejects incomplete payloads
- **WHEN** walkcalc code attempts to send a walkcalc notification type without required payload fields
- **THEN** the notification catalog rejects the payload before contacting APNs

### Requirement: Walkcalc push dispatch is deduplicated per event
The system SHALL avoid duplicate notifications to the same formal user for a single walkcalc event.

#### Scenario: Alert recipients are not sent a duplicate silent sync
- **WHEN** a formal user is selected for a visible alert for a walkcalc event
- **THEN** that same user does not receive an additional `walkcalc.sync.requested` for the same event

#### Scenario: Multiple roles still produce one alert
- **WHEN** a formal user appears multiple times in an event context, such as payer and participant or multiple debt transfers
- **THEN** the system sends at most one visible walkcalc alert to that user for the event

#### Scenario: Actor receives no visible self-alert
- **WHEN** the actor is also an affected formal participant
- **THEN** the actor does not receive a visible walkcalc alert
- **AND** the actor may receive one silent sync for the event so other devices can refresh
