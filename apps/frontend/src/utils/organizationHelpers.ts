export type OrganizationAddress = {
  label?: string;
  ville?: string;
  codePostal?: string;
};

export function extractOrganizationName(address: OrganizationAddress | undefined): string {
  return address?.label || '';
}

export function buildOrganizationAddress(name: string, postalCode?: string, city?: string): OrganizationAddress {
  return {
    label: name,
    codePostal: postalCode,
    ville: city,
  };
}

export function updateOrganizationName(
  currentAddress: OrganizationAddress | undefined,
  newName: string,
): OrganizationAddress {
  return {
    ...currentAddress,
    label: newName,
  };
}
