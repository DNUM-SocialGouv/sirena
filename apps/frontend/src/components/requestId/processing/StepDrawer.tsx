import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { Drawer } from '@sirena/ui';
import { useParams } from '@tanstack/react-router';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { useAddProcessingStepNote } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
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
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const addStepNoteMutation = useAddProcessingStepNote(requestId);
  const uploadFileMutation = useUploadFile();

  const openDrawer = (step: StepType) => {
    setStep(step ?? '');
    setIsOpen(true);
  };

  const handleCancel = () => {
    setContent('');
    setFiles([]);
    setStep(null);
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

  const handleSubmit = async () => {
    if (!step) {
      return;
    }

    setIsLoading(true);
    const fileIds = [];
    if (files.length > 0) {
      const data = await Promise.all(files.map((file) => uploadFileMutation.mutateAsync(file)));
      for (let i = 0; i < data.length; i += 1) {
        fileIds.push(data[i].id);
      }
    }

    await addStepNoteMutation.mutate(
      { content: content.trim(), id: step.id, fileIds },
      {
        onError: () => {
          setIsLoading(false);
          handleCancel();
        },
        onSuccess: () => {
          handleCancel();
          setIsOpen(false);
        },
      },
    );

    setIsLoading(false);
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
                disabled={isLoading}
                nativeTextAreaProps={{
                  rows: 8,
                  value: content,
                  onChange: (e) => setContent(e.target.value),
                }}
              />
              <Upload
                label="Ajouter un ou plusieurs fichiers"
                hint="Taille maximale: 10 Mo. Formats supportés: jpg, png, pdf."
                multiple
                disabled={isLoading}
                nativeInputProps={{
                  onChange: (e) => {
                    const files = e.target.files;
                    if (files) {
                      const fileArray = Array.from(files);
                      setFiles(fileArray.map((file) => new File([file], file.name, { type: file.type })));
                    }
                  },
                }}
              />
              <div className="display-end">
                <Button
                  type="button"
                  priority="primary"
                  size="small"
                  onClick={handleSubmit}
                  disabled={isLoading || (!content.trim() && files.length === 0)}
                >
                  {isLoading ? 'En cours...' : 'Ajouter la note'}
                </Button>
              </div>
            </form>
          </div>
        </Drawer.Panel>
      </Drawer.Portal>
    </Drawer.Root>
  );
});
