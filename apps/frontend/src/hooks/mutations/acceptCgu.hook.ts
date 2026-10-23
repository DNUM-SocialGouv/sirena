import { CGU_VERSION } from '@sirena/common/constants';
import { useMutation } from '@tanstack/react-query';
import { acceptCgu } from '@/lib/api/acceptCgu';

export const useAcceptCgu = () =>
  useMutation({
    mutationFn: () => acceptCgu(CGU_VERSION),
  });
