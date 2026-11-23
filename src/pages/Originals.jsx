import PillarPage from '../components/PillarPage.jsx';
import { pillars } from '../data/content.js';

/* /our-work/originals: the Originals pillar of the work (a public page; the header's "Our Work" menu opens it) */
const pillar = pillars.find((p) => p.key === 'originals');

export default function Originals() {
  return <PillarPage pillar={pillar} />;
}
