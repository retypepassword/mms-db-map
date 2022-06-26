export const extractData = (document: Document) => {
  const people = Array.from(document.getElementsByClassName('guideTable'));
  return people.map((person) => {
    const contactInfo = Object.fromEntries(
      Array.from(person.getElementsByClassName('cguide_info')).map((infoElement => {
        const infoIcon = infoElement.getElementsByTagName('i')[0];
        const infoEntryKey = [
          { key: 'website', when: () => !infoIcon },
          { key: 'email', when: () => infoIcon?.className.includes('envelope') },
          { key: 'facebook', when: () => infoIcon?.className.includes('facebook') },
          { key: 'instagram', when: () => infoIcon?.className.includes('instagram') },
          { key: 'phone', when: () => infoIcon?.className.includes('phone') },
          { key: 'twitter', when: () => infoIcon?.className.includes('twitter') },
          { key: 'other', when: () => 'otherwise' },
        ].find(({ when }) => when())?.key as string;
        const infoEntryValue = infoIcon?.nextSibling?.textContent ?? infoElement.getElementsByTagName('a')[0].textContent;
        return [infoEntryKey, infoEntryValue];
      }))
    );

    return {
      name: person.getElementsByClassName('cguide')[0].textContent,
      city: person.closest('tr')?.getElementsByClassName('ccity')[0].textContent,
      state: person.closest('table.stateTable')?.getElementsByClassName('cstate')[0].textContent,
      country: person.closest('table.stateTable')?.previousElementSibling?.getAttribute('name')?.split('_')?.[0],
      ...contactInfo
    };
  });
};