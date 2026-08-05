import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BreadCrumb } from './Breadcrumb';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('BreadCrumb', () => {
  const items = [
    { text: 'Accueil', to: '/', current: false },
    { text: 'Mentions légales', to: '/mentions-legales', current: true },
  ];

  it('renders links with their own destination for the non current pages', () => {
    render(<BreadCrumb items={items} />);

    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
  });

  it('does not render the current page as an activable link', () => {
    render(<BreadCrumb items={items} />);

    expect(screen.queryByRole('link', { name: 'Mentions légales' })).not.toBeInTheDocument();
    expect(screen.getByText('Mentions légales')).not.toHaveAttribute('href');
  });

  it('sets aria-current only on the current page', () => {
    render(<BreadCrumb items={items} />);

    expect(screen.getByText('Mentions légales')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
  });
});
