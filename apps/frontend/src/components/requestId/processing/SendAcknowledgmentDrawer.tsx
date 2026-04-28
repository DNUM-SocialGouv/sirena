import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Drawer, Toast } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { useSendAcknowledgment } from '@/hooks/mutations/updateProcessingStep.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { fetchAcknowledgmentMessage } from '@/lib/api/processingSteps';
import { HttpError } from '@/lib/api/tanstackQuery';
import styles from './CreateNoteDrawer.module.css';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

export type SendAcknowledgmentDrawerRef = {
  openDrawer(step: StepType): void;
  closeDrawer(): void;
};

// biome-ignore lint/complexity/noBannedTypes: react doesn't handle well
export type SendAcknowledgmentDrawerProps = {};

export const SendAcknowledgmentDrawer = forwardRef<SendAcknowledgmentDrawerRef, SendAcknowledgmentDrawerProps>(
  (_props, ref) => {
    const { requestId } = useParams({
      from: '/_auth/_user/request/$requestId',
    });

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<StepType | null>(null);
    const [declarantEmail, setDeclarantEmail] = useState('');
    const [message, setMessage] = useState('');
    const [comment, setComment] = useState('');
    const [isLoadingMessage, setIsLoadingMessage] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendAcknowledgmentMutation = useSendAcknowledgment(requestId);
    const toastManager = Toast.useToastManager();

    const generatedId = useId();
    const titleId = `${generatedId}-drawer`;
    const titleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
      if (isOpen) {
        titleRef.current?.focus();
      }
    }, [isOpen]);

    const handleReset = () => {
      setStep(null);
      setDeclarantEmail('');
      setMessage('');
      setComment('');
      setIsLoadingMessage(false);
      setIsSubmitting(false);
    };

    const openDrawer = async (s: StepType) => {
      handleReset();
      setStep(s);
      setIsOpen(true);
      setIsLoadingMessage(true);
      try {
        const data = await fetchAcknowledgmentMessage(s.id);
        setDeclarantEmail(data.declarantEmail ?? '');
        setMessage(data.message);
      } catch {
        toastManager.add({
          title: 'Erreur',
          description: 'Impossible de charger le message. Veuillez fermer et réessayer.',
          timeout: 0,
          data: { icon: 'fr-alert--error' },
        });
        setIsOpen(false);
      } finally {
        setIsLoadingMessage(false);
      }
    };

    const closeDrawer = () => {
      handleReset();
      setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({ openDrawer, closeDrawer }));

    const handleOpenChange = (open: boolean) => {
      if (!open) handleReset();
      setIsOpen(open);
    };

    const handleSubmit = () => {
      if (!step) return;

      setIsSubmitting(true);

      sendAcknowledgmentMutation.mutate(
        { id: step.id, comment: comment.trim() || undefined },
        {
          onError: (error) => {
            setIsSubmitting(false);
            let msg = "Une erreur est survenue lors de l'envoi de l'accusé de réception. Veuillez réessayer.";
            if (error instanceof HttpError && error.message) {
              msg = error.message;
            } else if (error instanceof Error && error.message) {
              msg = error.message;
            }
            toastManager.add({
              title: "Erreur lors de l'envoi",
              description: msg,
              timeout: 0,
              data: { icon: 'fr-alert--error' },
            });
          },
          onSuccess: () => {
            handleReset();
            setIsOpen(false);
            toastManager.add({
              title: 'Accusé de réception envoyé',
              description: "L'e-mail a bien été envoyé au déclarant.",
              timeout: 5000,
              data: { icon: 'fr-alert--success' },
            });
          },
        },
      );
    };

    const isLoading = isLoadingMessage || isSubmitting;

    return (
      <Drawer.Root variant="nonModal" withCloseButton={false} open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Panel style={{ width: 'min(90vw, 600px)', maxWidth: '100%' }} titleId={titleId}>
            <div
              style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0 16px 88px 16px',
                }}
              >
                <div className="fr-container fr-mt-8w">
                  <div className={styles.topActions}>
                    <Button
                      type="button"
                      priority="tertiary no outline"
                      iconId="fr-icon-close-line"
                      onClick={() => setIsOpen(false)}
                      disabled={isLoading}
                    >
                      Fermer
                    </Button>
                  </div>
                  <h3 ref={titleRef} id={titleId} className="fr-h6" tabIndex={-1}>
                    Envoyer l'accusé de réception
                  </h3>
                  {isLoadingMessage ? (
                    <p className="fr-text--sm fr-text-mention--grey">Chargement du message...</p>
                  ) : (
                    <form>
                      <Input
                        label="Adresse électronique du déclarant"
                        hintText="Ce champ est en lecture seule. Vous pouvez modifier l'adresse e-mail depuis les informations déclarant."
                        nativeInputProps={{
                          value: declarantEmail,
                          readOnly: true,
                          'aria-readonly': true,
                        }}
                      />
                      <Input
                        label="Ce message est généré automatiquement et ne peut pas être modifié"
                        textArea={true}
                        nativeTextAreaProps={{
                          rows: 14,
                          value: message,
                          readOnly: true,
                        }}
                      />
                      <Input
                        label="Commentaire personnalisé (facultatif)"
                        hintText="Vous pouvez ajouter des informations ou demander des précisions au déclarant. Ce commentaire sera intégré au message automatique."
                        textArea={true}
                        disabled={isSubmitting}
                        nativeTextAreaProps={{
                          rows: 5,
                          value: comment,
                          onChange: (e) => setComment(e.target.value),
                        }}
                      />

                      <div className={styles.footerActions}>
                        <Button
                          type="button"
                          priority="secondary"
                          size="small"
                          onClick={() => setIsOpen(false)}
                          disabled={isLoading}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          priority="primary"
                          size="small"
                          onClick={handleSubmit}
                          disabled={isLoading}
                        >
                          {isSubmitting ? 'Envoi en cours...' : "Envoyer l'accusé"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
);
