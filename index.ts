export const extractData = (document: Document) => {
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

      const infoEntryKey = [
        { key: 'website', when: () => !infoIcon },
        { key: 'email', when: () => infoIcon?.className.includes('envelope') },
        { key: 'facebook', when: () => infoIcon?.className.includes('facebook') },
        { key: 'instagram', when: () => infoIcon?.className.includes('instagram') },
        { key: 'phone', when: () => infoIcon?.className.includes('phone') },
        { key: 'twitter', when: () => infoIcon?.className.includes('twitter') },
        { key: 'other', when: () => 'otherwise' },
      ].find(({ when }) => when())?.key as string;
      const infoEntryValue = infoIcon?.nextSibling?.textContent ?? infoDiv.getElementsByTagName('a')[0].textContent;
      return [infoEntryKey, infoEntryValue];
    }))
  );
};