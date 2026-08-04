import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAcknowledgmentMessage } from '@/lib/api/processingSteps';
import { SendAcknowledgmentDrawer, type SendAcknowledgmentDrawerRef } from './SendAcknowledgmentDrawer';

const sendAcknowledgmentMutate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...original,
    useParams: () => ({ requestId: 'REQ-1' }),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/declarant">{children}</a>,
  };
});

vi.mock('@/hooks/mutations/updateProcessingStep.hook', () => ({
  useSendAcknowledgment: () => ({ mutate: sendAcknowledgmentMutate }),
}));

vi.mock('@/lib/api/processingSteps', () => ({
  fetchAcknowledgmentMessage: vi.fn(),
}));

vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();
  return {
    ...original,
    Toast: { ...original.Toast, useToastManager: () => ({ add: vi.fn() }) },
  };
});

describe('SendAcknowledgmentDrawer', () => {
  beforeEach(() => {
    sendAcknowledgmentMutate.mockReset();
    vi.mocked(fetchAcknowledgmentMessage).mockReset().mockResolvedValue({
      message: 'Message envoyé au déclarant',
      declarantEmail: 'declarant@example.com',
      subject: 'Accusé de réception',
    });
  });

  it("annonce que l’Étape de traitement sera partagée avant le formulaire d'envoi", async () => {
    const ref = createRef<SendAcknowledgmentDrawerRef>();
    render(<SendAcknowledgmentDrawer ref={ref} />);

    await act(async () => {
      await ref.current?.openDrawer({ id: 'ack-1' } as never);
    });

    expect(
      screen.getByText('Information : cette étape sera visible par les autres entités affectées.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Envoyer l'accusé" })).toBeInTheDocument();
  });
});
