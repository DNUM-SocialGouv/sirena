import Button from '@codegouvfr/react-dsfr/Button';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { Drawer } from '@sirena/ui';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useMarkRequeteDiscussionRead } from '@/hooks/mutations/markRequeteDiscussionRead.hook';
import { useRequeteUnreadCount } from '@/hooks/queries/requeteMessagesUnread.hook';
import { useHasFeature } from '@/hooks/useHasFeature';
import { useUnreadFavicon } from '@/hooks/useUnreadFavicon';
import { Discussion } from './Discussion';
import styles from './discussion.module.css';

type DiscussionDrawerProps = {
  requestId: string;
};

const pluralize = (count: number, singular: string, plural: string) => (count > 1 ? plural : singular);

// Reading time granted before pending messages count as read while the panel is open and focused.
const READ_AFTER_MS = 2000;

export const DiscussionDrawer = ({ requestId }: DiscussionDrawerProps) => {
  const discussionEnabled = useHasFeature(FEATURE_FLAGS.REQUETE_DISCUSSION, false);
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasOpenRef = useRef(false);

  const { data: unreadCount = 0 } = useRequeteUnreadCount(requestId, discussionEnabled);
  useUnreadFavicon(discussionEnabled ? unreadCount : 0);
  const markRead = useMarkRequeteDiscussionRead(requestId);
  const markReadRef = useRef(markRead.mutate);
  markReadRef.current = markRead.mutate;

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open && wasOpenRef.current) markReadRef.current();
    wasOpenRef.current = open;
  }, []);

  const handleOpen = useCallback(() => handleOpenChange(true), [handleOpenChange]);
  const handleClose = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  useEffect(() => {
    if (!isOpen || unreadCount === 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const onFocus = () => schedule();
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.hasFocus()) markReadRef.current();
        else window.addEventListener('focus', onFocus, { once: true });
      }, READ_AFTER_MS);
    };
    schedule();

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [isOpen, unreadCount]);

  useEffect(
    () => () => {
      if (wasOpenRef.current) markReadRef.current();
    },
    [],
  );

  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
  }, [isOpen]);

  if (!discussionEnabled) return null;

  const unreadLabel = `${unreadCount} ${pluralize(unreadCount, 'message non lu', 'messages non lus')}`;

  return (
    <>
      <Button priority="secondary" onClick={handleOpen} aria-expanded={isOpen}>
        Ouvrir la discussion
        {unreadCount > 0 ? (
          <>
            <span className={styles.buttonCount} aria-hidden="true">
              {unreadCount > 99 ? '99+' : String(unreadCount)}
            </span>
            <span className="fr-sr-only">, {unreadLabel}</span>
          </>
        ) : null}
      </Button>

      <p className="fr-sr-only" aria-live="polite">
        {!isOpen && unreadCount > 0 ? `${unreadLabel} dans la discussion` : ''}
      </p>

      <Drawer.Root variant="nonModal" withCloseButton={false} open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Panel style={{ width: 'min(90vw, 640px)', maxWidth: '100%' }} titleId={titleId}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <Button
                  type="button"
                  priority="tertiary no outline"
                  iconId="fr-icon-close-line"
                  iconPosition="right"
                  onClick={handleClose}
                >
                  Fermer
                </Button>
                <h2 id={titleId} className="fr-h4 fr-mb-0" ref={headingRef} tabIndex={-1}>
                  Discussion
                </h2>
              </div>
              <Discussion requestId={requestId} />
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};
