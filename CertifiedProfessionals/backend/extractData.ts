export type PersonData = {
  name: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  country: string | null | undefined;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export const extractData = (document: Document): PersonData[] => {
  const personInfoContainers = Array.from(document.getElementsByClassName('guideTable'));
  return personInfoContainers.map((personContainer) => ({
    name: personContainer.getElementsByClassName('cguide')[0].textContent,
    city: personContainer.closest('tr')?.getElementsByClassName('ccity')[0].textContent,
    state: personContainer.closest('table.stateTable')?.getElementsByClassName('cstate')[0].textContent,
    country: personContainer.closest('table.stateTable')?.previousElementSibling?.getAttribute('name')?.split('_')?.[0],
    ...extractContactInfo(personContainer)
  }));
};

const extractContactInfo = (personContainer: Element) => {
  return Object.fromEntries(
    Array.from(personContainer.getElementsByClassName('cguide_info')).map((infoDiv => {
      const infoIcon = infoDiv.getElementsByTagName('i')[0];

      const infoEntryKey = (() => {
        if (!infoIcon) {
          return 'website';
        }
        if (infoIcon.className.includes('envelope')) {
          return 'email';
        } 
        return ['facebook', 'instagram', 'phone', 'twitter'].find((k) => infoIcon.className.includes(k)) ?? 'other';
       })();
      const infoEntryValue = infoIcon?.nextSibling?.textContent ?? infoDiv.getElementsByTagName('a')[0].textContent;
      return [infoEntryKey, infoEntryValue];
    }))
  );
};