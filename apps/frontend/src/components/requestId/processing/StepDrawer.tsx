import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Drawer } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { useAddProcessingStepNote } from '@/hooks/mutations/addProcessingStep.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];
export type StepDrawerRef = {
  openDrawer: (step: StepType) => void;
};
// biome-ignore lint/complexity/noBannedTypes: react doesn't handle well Record<string, never>
export type StepDrawerProps = {};

export const StepDrawer = forwardRef<StepDrawerRef, StepDrawerProps>((_props, ref) => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<StepType | null>(null);
  const [content, setContent] = useState<string>('');
  const [contentError, setContentError] = useState<string | null>();

  const addStepNoteMutation = useAddProcessingStepNote(requestId);

  const openDrawer = (step: StepType) => {
    setStep(step ?? '');
    setIsOpen(true);
  };

  const handleCancel = () => {
    setContent('');
    setStep(null);
    setContentError(null);
  };

  useImperativeHandle(ref, () => ({
    openDrawer,
  }));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
    setIsOpen(open);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      setContentError("Le champ 'Détails de la note' est obligatoire. Veuillez le renseigner pour ajouter une note.");
      return;
    }

    if (!step) {
      return;
    }

    addStepNoteMutation.mutate(
      { content: content.trim(), requeteStateId: step.id },
      {
        onSuccess: () => {
          handleCancel();
          setIsOpen(false);
        },
      },
    );
  };

  return (
    <Drawer.Root mask={false} open={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Panel>
          <div className="fr-container fr-mt-8w">
            <h3 className="fr-h6">Ajotuer une note ou un fichier à l'étape "{step?.stepName ?? ''}"</h3>
            <form>
              <Input
                hintText="Informations à ajouter"
                label="Détails de la note"
                textArea={true}
                nativeTextAreaProps={{
                  rows: 8,
                  value: content,
                  onChange: (e) => setContent(e.target.value),
                }}
                state={contentError ? 'error' : 'default'}
                stateRelatedMessage={contentError}
              />
              <div className="display-end">
                <Button type="button" priority="primary" size="small" onClick={handleSubmit}>
                  Ajouter à l'étape
                </Button>
              </div>
            </form>
          </div>
        </Drawer.Panel>
      </Drawer.Portal>
    </Drawer.Root>
  );
});
