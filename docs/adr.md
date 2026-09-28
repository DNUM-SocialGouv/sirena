# Architecture Decision Record

## Choose Data Table Implementation

### Status

Proposed

### Context

We need a feature-rich, performant table for sorting, selection, nested data and theming. We currently maintain a home-grown `DataTable` component; TanStack Table (formerly React Table) is a popular alternative with a plug-in architecture.

### Decision Drivers

- **Simplicity**: We want minimal API surface and no extra learning curve, easy to plug with dsfr.  
- **Control**: We need full ownership over tweaks (styling, feature quirks).  
- **Maintenance effort**: We’re responsible for keeping our code working; adding a large external dep shifts some burden but also adds upgrade risk.

### Considered Options

1. **Create a custom `DataTable`**  
2. **Adopt TanStack Table**  

### Decision Outcome

We will **Create a custom `DataTable`**.

#### Pros

- **Lightweight**: No new dependencies, minimal bundle impact.  
- **Familiar API**: Engineers know it already; no ramp-up time.  
- **Full control**: We can tailor every behavior and style.
- **Simplicity**: We can more easly respect dsfr, evolve on it.
- **Open-source**: We could make a pr to add this component to react-dsfr.

#### Cons

- **Maintenance burden**: We must implement new features ourselves (e.g. virtualization).  
- **Reinventing the wheel**: Some advanced table features exist in TanStack’s ecosystem.

### Consequences

- Update documentation to make clear why we chose the custom route and how to extend it.

---

## SSE (Server-Sent Events) Security Design

### Status

Accepted

### Context

We replaced polling with Server-Sent Events (SSE) for real-time updates across the application: file processing status, requete updates, user status changes, and admin user list updates. SSE broadcasts events to all connected clients, which requires careful security design to prevent cross-entity data leaks.

### Decision Drivers

- **Entity isolation**: Users must only receive events for resources they have access to
- **Minimal data exposure**: Event payloads should contain only identifiers, not sensitive data
- **Defense in depth**: Even if an unauthorized event is received, actual data must still require proper authorization to fetch
- **Scalability**: Events must propagate across multiple backend instances and worker processes

### Security Model

#### Authentication & Authorization

All SSE endpoints require:
1. **Authentication**: `authMiddleware` validates JWT tokens
2. **Role-based access**: `roleMiddleware` restricts access to appropriate roles, except `/api/sse/profile`, deliberately mounted before the status and role gates so that an inactive or pending account learns about its own (re)activation
3. **Entity context**: `entitesMiddleware` provides `topEntiteId` and `entiteIds` for scoping

Access is checked at subscription time, then enforced by the `user:status` event: every stream of a user whose status or role changes is closed by the server on the spot (`closeOnUserStatusChange`, on by default in `createSSEStream`). The client reconnects and goes through the middlewares again, which accept or refuse the new situation. `/api/sse/profile` is the one stream that stays open, precisely so that an inactive account learns about its reactivation. The streams listen for that closing signal on a private mirror of `user:status`, so the connection metric (`sirena_sse_connections`, one listener per stream) is not inflated by it.

Events travel through Redis between API versions during a rolling deploy: the subscriber only re-emits the event types the running build knows, and a payload the connection filter cannot read is dropped with a warning rather than turned into an unhandled rejection.

#### Event Filtering Strategy

All SSE endpoints are consolidated under `/api/sse/*`:

| Endpoint | Filter | Rationale |
|----------|--------|-----------|
| `/api/sse/requetes` | `event.entiteId === topEntiteId` | Users only see their entity's requetes |
| `/api/sse/requetes/:id` | `event.requeteId === id && event.entiteId === topEntiteId` | Defense in depth: filter by both ID and entity |
| `/api/sse/files/:id` | `event.fileId === id && event.entiteId === topEntiteId` | Defense in depth: filter by both ID and entity |
| `/api/sse/requetes/:id/messages` | `created`: `event.requeteId === id && event.entiteIds.includes(topEntiteId)` — `read`: `event.userId === userId` | Cross-entity thread: a new message reaches every affected root entity, while a read receipt stays private to the reader's own sessions. Access and feature flag both checked at subscription |
| `/api/sse/profile` | `event.userId === userId` | Users only see their own status changes |
| `/api/sse/users` | SUPER_ADMIN: none — ENTITY_ADMIN: `event.entiteId !== null && entiteIds.includes(event.entiteId)` | Same scope as `GET /users`: an ENTITY_ADMIN only follows the users of their entity and its descendants, and never a user without entity (PENDING at first login), as the REST `IN` filter never matches NULL. The scope is settled once at subscription: an entity reorganisation during an open stream applies at reconnection, as for the cached descendant ids the REST list relies on |

#### Minimal Payload Design

SSE events contain only identifiers and metadata. All event types are centralized in `@sirena/common/constants` for type safety between backend and frontend:

```typescript
// From @sirena/common/constants

// Requete events - no sensitive data, just what changed
interface RequeteUpdatedEvent {
  requeteId: string;
  entiteId: string;
  field: RequeteUpdateField;  // Which field changed, not the value
}

// File events - processing status only. Storage paths and raw error messages stay server-side.
interface FileStatusEvent {
  fileId: string;
  entiteId: string | null;
  status: string;
  scanStatus: string;
  sanitizeStatus: string;
}

// User status events
interface UserStatusEvent {
  userId: string;
  statutId: string;
  roleId: string;
}

// User list events - just that something changed
interface UserListEvent {
  action: 'created' | 'updated' | 'deleted';
  userId: string;
  entiteId: string | null;
}

interface RequeteMessageEventBase {
  requeteId: string;
  entiteId: string;
  entiteIds: string[];
}

interface RequeteMessageCreatedEvent extends RequeteMessageEventBase {
  action: 'created';
  messageId: string;
}

interface RequeteMessageReadEvent extends RequeteMessageEventBase {
  action: 'read';
  messageIds: string[];
  userId: string;
}

type RequeteMessageEvent = RequeteMessageCreatedEvent | RequeteMessageReadEvent;
```

The frontend receives the event and must fetch actual data through regular API endpoints, which enforce full authorization.

### Architecture

#### Backend

- **Dedicated SSE controller**: All endpoints consolidated in `apps/backend/src/features/sse/sse.controller.ts`
- **Factory pattern**: `createSSEHandler` reduces boilerplate for defining SSE routes
- **Helper functions**: `requireTopEntiteId`, `requireUserId` for access validation
- **Redis Pub/Sub**: Events published to `sse:events` channel for multi-instance support
- **SSEEventManager**: Singleton that handles Redis subscription and local event emission

#### Frontend

- **Base hook**: `useSSE` handles connection, reconnection, and keep-alive
- **Specialized hooks**: `useFileStatusSSE`, `useUserStatusSSE`, `useUserListSSE`, `useRequetesListSSE`, `useRequeteStatusSSE`, `useRequeteMessagesSSE`
- **Shared types**: Import event types from `@sirena/common/constants`

#### Event Flow

1. Backend service calls `sseEventManager.emitXxx(event)`
2. Event published to Redis `sse:events` channel
3. All backend instances receive via Redis subscription
4. Each SSE connection applies its filter and forwards matching events
5. Frontend hook receives event and triggers callback/refetch

### Decision Outcome

We implement **server-side event filtering** where:
1. Events are broadcast via Redis Pub/Sub to all instances
2. Each SSE connection applies a filter based on the authenticated user's permissions
3. Payloads contain only identifiers; sensitive data requires separate API calls

### Consequences

- **Pro**: Simple architecture with centralized event publishing
- **Pro**: Horizontal scaling works naturally with Redis Pub/Sub
- **Pro**: Defense in depth prevents data leaks even if filtering fails
- **Con**: All events go through Redis even if no clients need them
- **Con**: Filter logic must be maintained for each event type
