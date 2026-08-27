import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LatestAnnouncementModal } from './LatestAnnouncementModal';

vi.mock('./AnnouncementModal', () => ({
  AnnouncementModal: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

const focusReturnRef = { current: null };

afterEach(cleanup);

describe('LatestAnnouncementModal', () => {
  it('renders only the latest configured announcement', () => {
    render(
      <LatestAnnouncementModal
        announcements={[
          {
            campaign: 'ancienne-v1',
            title: 'Ancienne annonce',
            content: 'Ancien contenu',
            isEligible: true,
          },
          {
            campaign: 'nouvelle-v1',
            title: 'Nouvelle annonce',
            content: 'Nouveau contenu',
            isEligible: true,
          },
        ]}
        focusReturnRef={focusReturnRef}
      />,
    );

    expect(screen.getByRole('region', { name: 'Nouvelle annonce' })).toBeInTheDocument();
    expect(screen.queryByText('Ancien contenu')).not.toBeInTheDocument();
  });

  it('does not fall back to an older announcement when the latest is ineligible', () => {
    const { container } = render(
      <LatestAnnouncementModal
        announcements={[
          {
            campaign: 'ancienne-v1',
            title: 'Ancienne annonce',
            content: 'Ancien contenu',
            isEligible: true,
          },
          {
            campaign: 'nouvelle-v1',
            title: 'Nouvelle annonce',
            content: 'Nouveau contenu',
            isEligible: false,
          },
        ]}
        focusReturnRef={focusReturnRef}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
