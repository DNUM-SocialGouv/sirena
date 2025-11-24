export type GetPractionnersParams = {
  'name:contains'?: string;
  identifier?: string;
};

export type GetOrganizationsParams = {
  'name:contains'?: string;
  identifier?: string;
  'address-postalcode:contains'?: string;
};
