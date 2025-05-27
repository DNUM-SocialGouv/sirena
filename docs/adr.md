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
