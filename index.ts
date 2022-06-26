export const scraper = (document: Document) => {
  const people = Array.from(document.getElementsByClassName('guideTable'));
  return people.map((person) => {
    const contactInfo = Object.fromEntries(
      Array.from(person.getElementsByClassName('cguide_info')).map((infoElement => {
        const infoIcon = infoElement.getElementsByTagName('i')[0];
        const infoEntryKey = !infoIcon ? 'website' :
          infoIcon?.className.includes('envelope') ? 'email' :
          infoIcon?.className.includes('facebook') ? 'facebook' :
          infoIcon?.className.includes('instagram') ? 'instagram' :
          infoIcon?.className.includes('phone') ? 'phone' :
          infoIcon?.className.includes('twitter') ? 'twitter' :
          'other';
        const infoEntryValue = infoIcon?.nextSibling?.textContent ?? infoElement.getElementsByTagName('a')[0].textContent
        return [infoEntryKey, infoEntryValue]
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