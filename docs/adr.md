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
2. **Role-based access**: `roleMiddleware` restricts access to appropriate roles
3. **Entity context**: `entitesMiddleware` provides `topEntiteId` and `entiteIds` for scoping

#### Event Filtering Strategy

All SSE endpoints are consolidated under `/api/sse/*`:

| Endpoint | Filter | Rationale |
|----------|--------|-----------|
| `/api/sse/requetes` | `event.entiteId === topEntiteId` | Users only see their entity's requetes |
| `/api/sse/requetes/:id` | `event.requeteId === id && event.entiteId === topEntiteId` | Defense in depth: filter by both ID and entity |
| `/api/sse/files/:id` | `event.fileId === id && event.entiteId === topEntiteId` | Defense in depth: filter by both ID and entity |
| `/api/sse/profile` | `event.userId === userId` | Users only see their own status changes |
| `/api/sse/users` | Admin-only access | Only SUPER_ADMIN and ENTITY_ADMIN can subscribe |

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

// File events - processing status with entity for filtering
interface FileStatusEvent {
  fileId: string;
  entiteId: string | null;
  status: string;
  scanStatus: string;
  sanitizeStatus: string;
  processingError: string | null;
  safeFilePath: string | null;
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
}
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
- **Specialized hooks**: `useFileStatusSSE`, `useUserStatusSSE`, `useUserListSSE`, `useRequetesListSSE`, `useRequeteStatusSSE`
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
