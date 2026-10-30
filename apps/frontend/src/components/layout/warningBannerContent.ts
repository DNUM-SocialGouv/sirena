export type WarningBannerContent = {
  title: string;
  description: string;
  link?: { href: string; text: string };
};

// Single edit point for the announcement, until the content becomes administrable.
export const WARNING_BANNER_CONTENT: WarningBannerContent = {
  title: 'Migration technique jeudi 5 novembre à 14h : SIRENA sera indisponible pendant quelques heures.',
  description: 'Merci d’anticiper cette interruption dans votre organisation.',
};
