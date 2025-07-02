import { useCallback, useState } from 'react';

export function useEntityLevels(onFinalChange: (id: string) => void) {
  const [level1, setLevel1State] = useState('');
  const [level2, setLevel2State] = useState('');
  const [level3, setLevel3State] = useState('');

  const setLevel1 = useCallback(
    (id: string) => {
      setLevel1State(id);
      setLevel2State('');
      setLevel3State('');
      onFinalChange(id);
    },
    [onFinalChange],
  );

  const setLevel2 = useCallback(
    (id: string) => {
      setLevel2State(id);
      setLevel3State('');
      onFinalChange(id === '' ? level1 : id);
    },
    [onFinalChange, level1],
  );

  const setLevel3 = useCallback(
    (id: string) => {
      setLevel3State(id);
      onFinalChange(id === '' ? level2 : id);
    },
    [onFinalChange, level2],
  );

  const setLevels = useCallback((l1 = '', l2 = '', l3 = '') => {
    setLevel1State(l1);
    setLevel2State(l2);
    setLevel3State(l3);
  }, []);

  return {
    level1,
    level2,
    level3,
    setLevel1,
    setLevel2,
    setLevel3,
    setLevels,
  };
}
