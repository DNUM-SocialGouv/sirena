import { Loader } from '@sirena/ui';
import { useCallback, useMemo, useState } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useRequeteMessages } from '@/hooks/queries/requeteMessages.hook';
import { useCanEdit } from '@/hooks/useCanEdit';
import styles from './discussion.module.css';
import { MessageComposer } from './MessageComposer';
import { MessageList } from './MessageList';

type DiscussionProps = {
  requestId: string;
};

export const Discussion = ({ requestId }: DiscussionProps) => {
  const messagesQuery = useRequeteMessages(requestId);
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const profile = useProfile();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery;

  const messages = useMemo(() => (data?.pages.flatMap((page) => page.data) ?? []).reverse(), [data]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const [separatorEpoch, setSeparatorEpoch] = useState(0);
  const handleSent = useCallback(() => setSeparatorEpoch((epoch) => epoch + 1), []);

  if (messagesQuery.isPending) {
    return <Loader />;
  }

  if (messagesQuery.isError) {
    return <QueryErrorState message="Erreur lors du chargement de la discussion" />;
  }

  return (
    <div className={styles.thread}>
      <MessageList
        messages={messages}
        ownEntiteId={profile.data?.topEntiteId ?? null}
        hasMore={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        separatorEpoch={separatorEpoch}
      />

      {canEdit ? <MessageComposer requestId={requestId} onSent={handleSent} /> : null}
    </div>
  );
};
