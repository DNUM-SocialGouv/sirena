export const parseAdresseDomicile = (adresseDomicile: string) => {
  if (!adresseDomicile?.trim()) {
    return { numero: '', rue: '' };
  }

  const match = adresseDomicile.match(/^(\d+)\s+(.+)$/);

  if (match) {
    return {
      numero: match[1],
      rue: match[2].trim(),
    };
  }

  return {
    numero: '',
    rue: adresseDomicile.trim(),
  };
};
