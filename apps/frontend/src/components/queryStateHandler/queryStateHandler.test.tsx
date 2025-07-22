import type { UseQueryResult } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryStateHandler } from './queryStateHandler';
import '@testing-library/jest-dom';

vi.mock('@sirena/ui', () => ({
  Loader: () => <div data-testid="loader">Loading...</div>,
}));

afterEach(() => {
  cleanup();
});

function createMockQuery<T = unknown>(overrides: Partial<UseQueryResult<T>> = {}): UseQueryResult<T> {
  return {
    isPending: false,
    isError: false,
    data: null,
    error: null,
    ...overrides,
  } as UseQueryResult<T>;
}

const mockChildren = ({ data }: { data: unknown }) => <div data-testid="children">Data: {JSON.stringify(data)}</div>;

describe('QueryStateHandler', () => {
  describe('empty state handling', () => {
    it('should display "Aucune donnée" when data is null', () => {
      render(<QueryStateHandler query={createMockQuery({ data: null })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByText('Aucune donnée à afficher')).toBeInTheDocument();
    });

    it('should display "Aucune donnée" when data is an empty array', () => {
      render(<QueryStateHandler query={createMockQuery({ data: [] })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByText('Aucune donnée à afficher')).toBeInTheDocument();
    });

    it('should display "Aucune donnée" when data object has a null "data" property', () => {
      render(<QueryStateHandler query={createMockQuery({ data: { data: null } })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByText('Aucune donnée à afficher')).toBeInTheDocument();
    });

    it('should display "Aucune donnée" when data object has an undefined "data" property', () => {
      render(
        <QueryStateHandler query={createMockQuery({ data: { data: undefined } })}>{mockChildren}</QueryStateHandler>,
      );
      expect(screen.getByText('Aucune donnée à afficher')).toBeInTheDocument();
    });

    it('should display "Aucune donnée" when data object has an empty array in "data" property', () => {
      render(<QueryStateHandler query={createMockQuery({ data: { data: [] } })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByText('Aucune donnée à afficher')).toBeInTheDocument();
    });
  });

  describe('non-empty data handling', () => {
    it('should render children when data is a non-empty array', () => {
      render(<QueryStateHandler query={createMockQuery({ data: [1, 2, 3] })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByTestId('children')).toBeInTheDocument();
    });

    it('should render children when data object has a non-empty array in "data" property', () => {
      render(
        <QueryStateHandler query={createMockQuery({ data: { data: [1, 2, 3] } })}>{mockChildren}</QueryStateHandler>,
      );
      expect(screen.getByTestId('children')).toBeInTheDocument();
    });

    it('should render children when data object has no "data" property', () => {
      render(
        <QueryStateHandler query={createMockQuery({ data: { something: 'else' } })}>{mockChildren}</QueryStateHandler>,
      );
      expect(screen.getByTestId('children')).toBeInTheDocument();
    });

    it('should render children when data is a non-array primitive', () => {
      render(<QueryStateHandler query={createMockQuery({ data: 'test' })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByTestId('children')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should display default loader when query is pending', () => {
      render(<QueryStateHandler query={createMockQuery({ isPending: true })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('should display custom fallback loader when provided', () => {
      render(
        <QueryStateHandler
          query={createMockQuery({ isPending: true })}
          fallback={<div data-testid="custom-loader">Custom Loading...</div>}
        >
          {mockChildren}
        </QueryStateHandler>,
      );
      expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display default error message when query is in error', () => {
      render(
        <QueryStateHandler query={createMockQuery({ isError: true, error: new Error('Test error') })}>
          {mockChildren}
        </QueryStateHandler>,
      );
      expect(screen.getByText('Erreur lors du chargement des données')).toBeInTheDocument();
    });

    it('should display custom error component when provided', () => {
      const customErrorComponent = (error: unknown) => (
        <div data-testid="custom-error">Custom Error: {(error as Error).message}</div>
      );

      render(
        <QueryStateHandler
          query={createMockQuery({ isError: true, error: new Error('Test error') })}
          errorComponent={customErrorComponent}
        >
          {mockChildren}
        </QueryStateHandler>,
      );
      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should render children when data is available', () => {
      const testData = { name: 'John', age: 30 };
      render(<QueryStateHandler query={createMockQuery({ data: testData })}>{mockChildren}</QueryStateHandler>);
      expect(screen.getByTestId('children')).toBeInTheDocument();
      expect(screen.getByText(`Data: ${JSON.stringify(testData)}`)).toBeInTheDocument();
    });

    it('should render custom noDataComponent when provided and data is empty', () => {
      render(
        <QueryStateHandler
          query={createMockQuery({ data: [] })}
          noDataComponent={<div data-testid="custom-no-data">No data available</div>}
        >
          {mockChildren}
        </QueryStateHandler>,
      );
      expect(screen.getByTestId('custom-no-data')).toBeInTheDocument();
    });
  });
});
