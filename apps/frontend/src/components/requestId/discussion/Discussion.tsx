import { Loader } from '@sirena/ui';
import { useCallback, useMemo } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useRequeteMessages } from '@/hooks/queries/requeteMessages.hook';
import styles from './discussion.module.css';
import { MessageList } from './MessageList';

type DiscussionProps = {
  requestId: string;
};

export const Discussion = ({ requestId }: DiscussionProps) => {
  const messagesQuery = useRequeteMessages(requestId);
  const profile = useProfile();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery;

  const messages = useMemo(() => (data?.pages.flatMap((page) => page.data) ?? []).reverse(), [data]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

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
      />
    </div>
  );
};
