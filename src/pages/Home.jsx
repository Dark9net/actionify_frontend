import { useEffect } from 'react';
import Hero from '../components/Hero.jsx';
import Booking from '../components/Booking.jsx';
import Statement from '../components/Statement.jsx';
import Services from '../components/Services.jsx';
import WorkPreview from '../components/WorkPreview.jsx';
import FivePillars from '../components/FivePillars.jsx';
import Footer from '../components/Footer.jsx';

/* The landing page, top to bottom (the five pillars take the place of "How hiring a pro works"). */
export default function Home({ ready }) {
  useEffect(() => {
    document.title = 'Actionify';
  }, []);

  return (
    <>
      <main id="main">
        <Hero ready={ready} />
        <Booking ready={ready} />
        <Statement />
        <Services />
        <WorkPreview />
        <FivePillars />
      </main>
      <Footer />
    </>
  );
}
