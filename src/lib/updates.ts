import updatesJson from '../../data/updates.json';

export type UpdateItem = {
  date: string;
  title: string;
  body: string;
  link?: string;
};

export function getUpdates(): UpdateItem[] {
  return [...(updatesJson as UpdateItem[])].sort((a, b) => b.date.localeCompare(a.date));
}
