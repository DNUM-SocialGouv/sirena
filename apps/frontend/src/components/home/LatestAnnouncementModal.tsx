import type { ReactNode } from 'react';
import { type AnnouncementAction, AnnouncementModal } from './AnnouncementModal';

export type AnnouncementConfiguration = {
  campaign: string;
  title: string;
  content: ReactNode;
  action?: AnnouncementAction;
  isEligible: boolean;
};

type LatestAnnouncementModalProps = {
  announcements: readonly AnnouncementConfiguration[];
};

export function LatestAnnouncementModal({ announcements }: LatestAnnouncementModalProps) {
  const latestAnnouncement = announcements.at(-1);

  if (!latestAnnouncement?.isEligible) return null;

  return (
    <AnnouncementModal
      campaign={latestAnnouncement.campaign}
      title={latestAnnouncement.title}
      action={latestAnnouncement.action}
    >
      {latestAnnouncement.content}
    </AnnouncementModal>
  );
}
