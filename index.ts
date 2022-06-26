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

      const infoEntryKey = (() => {
        if (!infoIcon) {
          return 'website';
        } else if (infoIcon.className.includes('envelope')) {
          return 'email';
        } else if (infoIcon.className.includes('facebook')) {
          return 'facebook';
        } else if (infoIcon.className.includes('instagram')) {
          return 'instagram';
        } else if (infoIcon.className.includes('phone')) {
          return 'phone';
        } else if (infoIcon.className.includes('twitter')) {
          return 'twitter';
        } else {
          return 'other';
        }
      })(); 
      const infoEntryValue = infoIcon?.nextSibling?.textContent ?? infoDiv.getElementsByTagName('a')[0].textContent;
      return [infoEntryKey, infoEntryValue];
    }))
  );
};