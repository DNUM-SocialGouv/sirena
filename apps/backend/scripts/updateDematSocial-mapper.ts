import { updateObjectPropertyInFile, type Variables } from '@/features/dematSocial/dematSocial.helper';

const variables: Variables[] = [];

updateObjectPropertyInFile('./src/features/dematSocial/dematSocial.mapper.ts', variables);
