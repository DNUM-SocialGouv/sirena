export type GetPractionnersParams = {
  'given:contains'?: string;
  identifier?: string;
};

export type GetOrganizationsParams = {
  'name:contains'?: string;
  identifier?: string;
  'address-postalcode'?: string;
};
