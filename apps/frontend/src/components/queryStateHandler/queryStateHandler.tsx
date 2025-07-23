import { Loader } from '@sirena/ui';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Props for the QueryStateHandler component
 *
 * This component handles the different states of a TanStack Query result:
 * - Loading: Shows fallback component
 * - Error: Shows error component or default message
 * - Empty: Shows noDataComponent (unless disabled)
 * - Success: Renders children with data
 */
interface QueryStateHandlerProps<T> {
  /** The TanStack Query result object */
  query: UseQueryResult<T>;
  /** Function that renders the content when data is available */
  children: (params: { data: T; query: UseQueryResult<T> }) => React.ReactNode;
  /** Component to show while the query is pending (default: <Loader />) */
  fallback?: React.ReactNode;
  /** Custom component to show when the query has an error */
  errorComponent?: (error: unknown) => React.ReactNode;
  /** Component to show when data is empty (default: "Aucune donnée à afficher") */
  noDataComponent?: React.ReactNode;
}

/**
 * Checks if the given data is considered empty
 *
 * Data is considered empty when:
 * - null or undefined
 * - empty array []
 * - object with empty data property: { data: null/undefined/[] }
 *
 * @param data - The data to check
 * @returns true if the data is empty, false otherwise
 */
function isEmpty(data: unknown): boolean {
  if (!data) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object' && 'data' in data) {
    const innerData = (data as { data?: unknown }).data;
    if (!innerData) return true;
    if (Array.isArray(innerData)) return innerData.length === 0;
  }
  return false;
}

/**
 * A React component that handles the different states of a TanStack Query result
 * and renders appropriate UI based on the query state.
 *
 * @example Basic usage
 * ```tsx
 * <QueryStateHandler query={usersQuery}>
 *   {({ data }) => <UserList users={data} />}
 * </QueryStateHandler>
 * ```
 *
 * @example Custom loading state
 * ```tsx
 * <QueryStateHandler
 *   query={usersQuery}
 *   fallback={<div>Loading users...</div>}
 * >
 *   {({ data }) => <UserList users={data} />}
 * </QueryStateHandler>
 * ```
 *
 * @example Custom error handling
 * ```tsx
 * <QueryStateHandler
 *   query={usersQuery}
 *   errorComponent={(error) => (
 *     <div>Failed to load users: {error.message}</div>
 *   )}
 * >
 *   {({ data }) => <UserList users={data} />}
 * </QueryStateHandler>
 * ```
 */
export function QueryStateHandler<T>({
  query,
  children,
  fallback = <Loader />,
  errorComponent,
  noDataComponent = <p>Aucune donnée à afficher</p>,
}: QueryStateHandlerProps<T>) {
  if (query.isPending) return fallback;

  if (query.isError) {
    return errorComponent ? (
      errorComponent(query.error)
    ) : (
      <div className="error-state">
        <p>Erreur lors du chargement des données</p>
      </div>
    );
  }

  if (isEmpty(query.data)) {
    return noDataComponent;
  }

  return <>{children({ data: query.data, query })}</>;
}
