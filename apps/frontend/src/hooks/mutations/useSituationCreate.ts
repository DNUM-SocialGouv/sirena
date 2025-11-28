import type { SituationData } from '@sirena/common/schemas';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { uploadFile } from '@/lib/api/fetchUploadedFiles';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

type ErrorWithRequeteId = Error & {
  requeteId?: string;
};

export const useSituationCreate = () => {
  const navigate = useNavigate();

  const saveMutation = useMutation({
    mutationFn: async ({ data, faitFiles }: { data: SituationData; faitFiles: File[] }) => {
      let requeteId: string | undefined;

      try {
        const createResponse = await client['requetes-entite'].$post({
          json: {},
        });

        await handleRequestErrors(createResponse);
        const createResult = await createResponse.json();
        requeteId = createResult.data.id;

        const faitFileIds: string[] = [];
        if (faitFiles.length > 0) {
          const uploadedFaitFiles = await Promise.all(faitFiles.map((file) => uploadFile(file)));
          faitFileIds.push(...uploadedFaitFiles.map((file) => file.id));
        }

        const enrichedData: SituationData = {
          ...data,
          fait: data.fait
            ? { ...data.fait, fileIds: faitFileIds }
            : faitFileIds.length > 0
              ? { fileIds: faitFileIds }
              : undefined,
        };

        const updateResponse = await client['requetes-entite'][':id'].situation.$post({
          param: { id: requeteId },
          json: { situation: enrichedData },
        });

        await handleRequestErrors(updateResponse);
        const updateResult = await updateResponse.json();
        return updateResult.data;
      } catch (err) {
        if (requeteId) {
          (err as ErrorWithRequeteId).requeteId = requeteId;
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      if (result?.id) {
        navigate({ to: '/request/$requestId', params: { requestId: result.id } });
      }
    },
    onError: (error) => {
      const requeteId = (error as ErrorWithRequeteId).requeteId;
      if (requeteId) {
        navigate({ to: '/request/$requestId', params: { requestId: requeteId } });
      }
      console.error(error);
    },
  });

  const handleSave = async (data: SituationData, shouldCreateRequest: boolean, faitFiles: File[]) => {
    if (shouldCreateRequest) {
      await saveMutation.mutateAsync({ data, faitFiles });
    } else {
      navigate({ to: '/request/create' });
    }
  };

  return { handleSave };
};
