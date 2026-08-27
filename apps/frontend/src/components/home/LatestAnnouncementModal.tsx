import type { ReactNode, RefObject } from 'react';
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
  focusReturnRef: RefObject<HTMLElement | null>;
};

export function LatestAnnouncementModal({ announcements, focusReturnRef }: LatestAnnouncementModalProps) {
  const latestAnnouncement = announcements.at(-1);

  if (!latestAnnouncement?.isEligible) return null;

  return (
    <AnnouncementModal
      campaign={latestAnnouncement.campaign}
      title={latestAnnouncement.title}
      action={latestAnnouncement.action}
      focusReturnRef={focusReturnRef}
    >
      {latestAnnouncement.content}
    </AnnouncementModal>
  );
}
