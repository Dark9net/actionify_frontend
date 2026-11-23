import PillarPage from '../components/PillarPage.jsx';
import { pillars } from '../data/content.js';

/* /our-work/production: the Production pillar of the work (a public page; the header's "Our Work" menu opens it) */
const pillar = pillars.find((p) => p.key === 'production');

export default function Production() {
  return <PillarPage pillar={pillar} />;
}
