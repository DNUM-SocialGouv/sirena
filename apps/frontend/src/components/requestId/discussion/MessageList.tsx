import Button from '@codegouvfr/react-dsfr/Button';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { RequeteMessage } from '@/hooks/queries/requeteMessages.hook';
import styles from './discussion.module.css';
import { MessageItem } from './MessageItem';

const STICK_TO_BOTTOM_THRESHOLD_PX = 40;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const formatTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

type MessageListProps = {
  messages: RequeteMessage[];
  ownEntiteId: string | null;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  separatorEpoch?: number;
};

export const MessageList = ({
  messages,
  ownEntiteId,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  separatorEpoch = 0,
}: MessageListProps) => {
  const scrollerRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unreadSeparatorRef = useRef<HTMLLIElement>(null);
  const wasAtBottomRef = useRef(true);
  const previousFirstIdRef = useRef<string | null>(null);
  const previousLastIdRef = useRef<string | null>(null);
  const scrollHeightBeforeLoadRef = useRef<number | null>(null);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    bottomRef.current?.scrollIntoView({
      behavior: behavior === 'smooth' && prefersReducedMotion() ? 'auto' : behavior,
      block: 'end',
    });
    setHasNewMessagesBelow(false);
  }, []);

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < STICK_TO_BOTTOM_THRESHOLD_PX;
    wasAtBottomRef.current = atBottom;
    if (atBottom) setHasNewMessagesBelow(false);
  }, []);

  const handleShowNewMessages = useCallback(() => {
    scrollToBottom('smooth');
    scrollerRef.current?.focus();
  }, [scrollToBottom]);

  const handleLoadMore = useCallback(() => {
    if (isFetchingNextPage) return;
    scrollHeightBeforeLoadRef.current = scrollerRef.current?.scrollHeight ?? null;
    onLoadMore();
  }, [isFetchingNextPage, onLoadMore]);

  useEffect(() => {
    const [firstMessage] = messages;
    const lastMessage = messages.at(-1);

    if (!firstMessage || !lastMessage) {
      previousFirstIdRef.current = null;
      previousLastIdRef.current = null;
      return;
    }

    const previousFirstId = previousFirstIdRef.current;
    const previousLastId = previousLastIdRef.current;
    previousFirstIdRef.current = firstMessage.id;
    previousLastIdRef.current = lastMessage.id;

    if (previousFirstId === null) {
      if (unreadSeparatorRef.current) {
        unreadSeparatorRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        scrollToBottom('auto');
      }
      return;
    }

    const scroller = scrollerRef.current;
    const olderPagePrepended = firstMessage.id !== previousFirstId;
    const heightBeforeLoad = scrollHeightBeforeLoadRef.current;

    if (olderPagePrepended && scroller && heightBeforeLoad !== null) {
      scroller.scrollTop += scroller.scrollHeight - heightBeforeLoad;
      scrollHeightBeforeLoadRef.current = null;
      if (!hasMore && document.activeElement === document.body) scroller.focus();
    }

    if (lastMessage.id === previousLastId) return;

    setAnnouncement(`Nouveau message de ${lastMessage.entite.nomComplet} à ${formatTime(lastMessage.createdAt)}`);

    if (wasAtBottomRef.current) {
      scrollToBottom('smooth');
      return;
    }

    setHasNewMessagesBelow(true);
  }, [messages, hasMore, scrollToBottom]);

  const [frozen, setFrozen] = useState<{ epoch: number; id: string } | null>(null);
  const firstUnreadId = messages.find((message) => !message.isReadByCurrentUser)?.id ?? null;
  const frozenSeparatorId = frozen?.epoch === separatorEpoch ? frozen.id : null;

  useEffect(() => {
    if (frozenSeparatorId === null && firstUnreadId !== null) {
      setFrozen({ epoch: separatorEpoch, id: firstUnreadId });
    }
  }, [frozenSeparatorId, firstUnreadId, separatorEpoch]);

  const separatorId = frozenSeparatorId ?? firstUnreadId;
  const firstUnreadIndex = separatorId === null ? -1 : messages.findIndex((message) => message.id === separatorId);

  return (
    <>
      <p className="fr-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {messages.length > 0 && (
        <section
          className={styles.scroller}
          ref={scrollerRef}
          onScroll={handleScroll}
          aria-label="Messages de la discussion"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard (RGAA 13.x)
          tabIndex={0}
        >
          {hasMore ? (
            <div className="fr-mb-2w">
              <Button priority="tertiary" size="small" onClick={handleLoadMore} aria-busy={isFetchingNextPage}>
                {isFetchingNextPage ? 'Chargement…' : 'Charger les messages précédents'}
              </Button>
            </div>
          ) : null}

          <ul className={styles.messages} role="list">
            {messages.map((message, index) => (
              <Fragment key={message.id}>
                {index === firstUnreadIndex ? (
                  <li ref={unreadSeparatorRef} className={styles.unreadSeparator} aria-label="Messages non lus">
                    <span aria-hidden="true">Non lus</span>
                  </li>
                ) : null}
                <MessageItem message={message} isOwnEntite={message.entite.id === ownEntiteId} />
              </Fragment>
            ))}
          </ul>

          <div ref={bottomRef} />

          {hasNewMessagesBelow ? (
            <div className={styles.newMessagesButton}>
              <Button priority="secondary" size="small" onClick={handleShowNewMessages}>
                Nouveaux messages
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </>
  );
};
