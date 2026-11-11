/**
 * Norske drikke-enheter. Første volum er standard, og standardstyrken er `defaultStrength`
 * (indeks i `strengths`, 0 hvis den ikke er satt).
 * Legg til en ny kategori ved å legge til et objekt i listen.
 * Ikonene er navn på Lucide-ikoner (se DrinkLogger.jsx).
 */
export const DRINKS = [
  {
    id: 'beer-04',
    icon: 'Beer',
    name: 'Øl 0,4 l',
    hint: 'Fatøl / utepils',
    volumes: [{ dl: 4, label: '0,4 l' }],
    strengths: [
      { abv: 4.7, label: '4,7 %', hint: 'Standard pils' },
      { abv: 5.5, label: '5,5 %', hint: 'Sterkøl / IPA' },
      { abv: 3.5, label: '3,5 %', hint: 'Lettøl' },
    ],
  },
  {
    id: 'beer-05',
    icon: 'Beer',
    name: 'Øl 0,5 l',
    hint: 'Boks / halvliter',
    volumes: [{ dl: 5, label: '0,5 l' }],
    strengths: [
      { abv: 4.7, label: '4,7 %', hint: 'Standard pils' },
      { abv: 6, label: '6,0 %', hint: 'IPA / juleøl' },
      { abv: 7, label: '7,0 %', hint: 'Dobbeltbokk / sterkøl' },
    ],
  },
  {
    id: 'beer-06',
    icon: 'Beer',
    name: 'Øl 0,6 l',
    hint: 'Stor tappekran / seidel',
    volumes: [{ dl: 6, label: '0,6 l' }],
    strengths: [
      { abv: 4.7, label: '4,7 %', hint: 'Standard pils' },
      { abv: 5.5, label: '5,5 %', hint: 'Håndverksøl' },
    ],
  },
  {
    id: 'wine',
    icon: 'Wine',
    name: 'Glass vin',
    hint: 'Rødvin / hvitvin / bobler',
    volumes: [
      { dl: 1.5, label: '1,5 dl' },
      { dl: 2, label: 'Stort 2,0 dl' },
    ],
    strengths: [
      { abv: 11.5, label: '11,5 %', hint: 'Prosecco / musserende' },
      { abv: 12.5, label: '12,5 %', hint: 'Hvitvin / rosé' },
      { abv: 13.5, label: '13,5 %', hint: 'Standard rødvin' },
      { abv: 14.5, label: '14,5 %', hint: 'Kraftig rødvin' },
    ],
    defaultStrength: 2,
  },
  {
    id: 'cocktail',
    icon: 'Martini',
    name: 'Drink / dram',
    hint: '4 cl brennevin (skjenkestandard)',
    volumes: [{ dl: 0.4, label: '4 cl' }],
    strengths: [
      { abv: 37.5, label: '37,5 %', hint: 'Vodka / gin / rom' },
      { abv: 40, label: '40 %', hint: 'Whisky / cognac / brennevin' },
      { abv: 22, label: '22 %', hint: 'Likør / Aperol' },
    ],
  },
  {
    id: 'shot',
    icon: 'GlassWater',
    name: 'Shot',
    hint: 'Shotglass',
    volumes: [
      { dl: 0.4, label: '4 cl' },
      { dl: 0.2, label: 'Liten 2 cl' },
    ],
    strengths: [
      { abv: 20, label: '20 %', hint: "Småsure / Fisk / Hot'n Sweet" },
      { abv: 35, label: '35 %', hint: 'Jägermeister' },
      { abv: 40, label: '40 %', hint: 'Tequila / vodka / akevitt' },
    ],
    defaultStrength: 2,
  },
];

export const findDrink = (id) => DRINKS.find((d) => d.id === id);

/** Standardvalget for en kategori. */
export const defaultChoice = (drink) => ({ volume: 0, strength: drink.defaultStrength ?? 0 });

/** Volum og styrke for valgt alternativ i en kategori. */
export function resolveChoice(drink, choice = {}) {
  const volume = drink.volumes[choice.volume] ?? drink.volumes[0];
  const strength = drink.strengths[choice.strength] ?? drink.strengths[drink.defaultStrength ?? 0];
  return {
    volumeDl: volume.dl,
    abv: strength.abv,
    volumeLabel: volume.label,
    abvLabel: strength.label,
  };
}

/** Høyeste antall av én kategori i oppsummeringsmodus. */
export const MAX_PER_DRINK = 40;

/** «Øl 0,5 l · 4,7 %» – kort navn på en registrert enhet. */
export function entryLabel(entry) {
  const drink = findDrink(entry.drinkId);
  const volume = drink?.volumes.find((v) => v.dl === entry.volumeDl);
  const name = drink?.name ?? 'Enhet';
  const showVolume = drink && drink.volumes.length > 1;
  const abv = `${String(entry.abv).replace('.', ',')} %`;
  return `${name}${showVolume && volume ? ` ${volume.label.toLowerCase()}` : ''} · ${abv}`;
}
