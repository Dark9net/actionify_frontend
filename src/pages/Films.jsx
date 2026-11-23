import PillarPage from '../components/PillarPage.jsx';
import { pillars } from '../data/content.js';

/* /our-work/films: the Films pillar of the work (a public page; the header's "Our Work" menu opens it) */
const pillar = pillars.find((p) => p.key === 'films');

export default function Films() {
  return <PillarPage pillar={pillar} />;
}
