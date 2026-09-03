'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import type { Product } from '../../data/products';
import { OptimizedRawImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import './about-page.css';

const canvasDetail = '/product-support/what-arrives-canvas-detail-v2.jpg';

type HistoryChapter = {
  year: string;
  title: string;
  image: string;
  alt: string;
  body: string;
  visual?: 'storefront';
};

function roomImage(product?: Product) {
  return product?.gallery?.[3] || product?.gallery?.[2] || product?.image || canvasDetail;
}

export default function AboutPageClient({ allProducts, featuredProduct }: {
  allProducts: Product[];
  featuredProduct: Product;
}) {
  const [activeValue, setActiveValue] = useState<number | null>(null);
  const [activeHistory, setActiveHistory] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const rewind = allProducts.find((product) => product.slug === 'life-has-no-rewind');
  const dialed = allProducts.find((product) => product.slug === 'dialed-in');
  const heroImage = roomImage(featuredProduct);
  const rewindImage = roomImage(rewind);
  const dialedImage = roomImage(dialed);
  const values = [
    {
      title: 'Creativity with purpose',
      image: dialedImage,
      alt: 'Dialed In canvas displayed in a workspace',
      color: '#68694b',
      paragraphs: [
        'A familiar object can carry a different meaning. A cassette becomes a reminder to enjoy the moment. A control panel becomes a way to think about focus, growth, and the choices we make every day.',
        'That is the thinking behind Armoze: artwork with a clear idea, a little personality, and something worth coming back to. We want each piece to feel at home in your space and connected to your life.',
      ],
    },
    {
      title: 'Care in the details',
      image: canvasDetail,
      alt: 'Close-up of the matte canvas texture and wrapped edge',
      color: '#947257',
      paragraphs: [
        'The idea matters. So does the finished piece. Our canvas prints are made to order in the USA, with a matte finish and a stretched, ready-to-hang format.',
        'From choosing a size to finding the right place on your wall, we want the experience to feel considered. And if something arrives damaged or incorrect, our support team is here to help you put it right.',
      ],
    },
    {
      title: 'Make it personal',
      image: rewindImage,
      alt: 'Life Has No Rewind canvas in a warm interior',
      color: '#343247',
      paragraphs: [
        'Your space should feel like you. The music you love, the goals you’re working toward, and the reminders you need all have a place on your walls.',
        'We create artwork for bedrooms, offices, studios, and everyday spaces. Choose the piece that speaks to you, give it a place in your routine, and make the room your own.',
      ],
    },
  ];
  const history: HistoryChapter[] = [
    {
      year: '2020',
      title: 'An Etsy beginning',
      image: rewindImage,
      alt: 'Life Has No Rewind, an Armoze canvas design',
      body: 'Armoze started on Etsy in 2020, during the COVID pandemic. At a time when home took on a bigger role in everyday life, the idea was simple: create artwork that makes a space feel more personal and gives you something meaningful to see each day.',
    },
    {
      year: '2021',
      title: 'Launching our online store',
      image: heroImage,
      alt: 'Illustration of the Armoze online store displayed on a laptop',
      visual: 'storefront',
      body: 'In 2021, Armoze launched its own online store, building on our Etsy beginnings. A dedicated home for the collection made it easier to discover our canvas artwork, explore the designs, and find a piece that feels right for your space.',
    },
    {
      year: '2023',
      title: 'Expansion across the United States',
      image: dialedImage,
      alt: 'Dialed In canvas bringing focus and personality to a home workspace',
      body: 'In 2023, Armoze expanded its reach across the United States, bringing our canvas artwork into more everyday spaces. From bedrooms and home offices to creative studios, the focus stayed the same: meaningful designs that make a room feel personal.',
    },
    {
      year: 'Today',
      title: 'Still creating with purpose',
      image: heroImage,
      alt: 'Bookshelf Mindset canvas above a desk',
      body: 'Today, our collection brings together motivation, music, and ambition through canvas artwork made for the rooms where life happens. From our first Etsy shop to our own online store, the purpose remains the same: make room for what matters to you.',
    },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeValue !== null) {
      dialog?.showModal();
      document.body.classList.add('story-dialog-lock');
    } else {
      dialog?.close();
    }
    return () => document.body.classList.remove('story-dialog-lock');
  }, [activeValue]);

  function goToHistory(index: number) {
    const track = historyRef.current;
    if (!track) return;
    const cards = track.querySelectorAll<HTMLElement>('.story-history-card');
    if (!cards[index]) return;
    track.scrollTo({
      left: cards[index].offsetLeft - cards[0].offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }

  return (
    <StorefrontShell products={allProducts}>
      <StorefrontTracker />
      <main className="story-page">
        <section className="story-hero" aria-labelledby="story-title">
          <div className="story-hero-art">
            <OptimizedRawImage className="story-hero-image" src={dialedImage} alt="Dialed In canvas displayed in a sunlit workspace" fill priority sizes="(max-width: 760px) 100vw, (max-width: 1207px) 58vw, 700px" />
          </div>
          <div className="story-hero-shade" aria-hidden="true" />
          <div className="story-container story-hero-copy">
            <p>Our Story</p>
            <h1 id="story-title">Art for the life<br />you’re building.</h1>
          </div>
        </section>

        <div className="story-content">
          <section className="story-container story-journey" aria-labelledby="story-journey-title">
            <div className="story-collage">
              <div className="story-collage-back"><OptimizedRawImage src={dialedImage} alt="Dialed In canvas, a reminder of focus and growth" fill sizes="(max-width: 760px) 72vw, 38vw" /></div>
              <div className="story-collage-front"><OptimizedRawImage src={rewindImage} alt="Life Has No Rewind canvas, a reminder to enjoy every moment" fill sizes="(max-width: 760px) 46vw, 24vw" /></div>
            </div>
            <div className="story-journey-copy">
              <h2 id="story-journey-title">Our <span className="story-underline">Journey</span></h2>
              <p>Armoze began in 2020, during the COVID pandemic, with a shop on Etsy and a simple idea: the things we surround ourselves with can mean something.</p>
              <p>As home became the place for work, creativity, and everything in between, we wanted to create artwork that brought a little more purpose and personality to those everyday spaces.</p>
              <p>Today, that idea lives on through canvas prints inspired by motivation, music, and ambition. Pieces that remind you of what matters, wherever you are in your own journey.</p>
              <Link className="story-pill" href="#our-history">Our History <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </section>

          <section className="story-container story-values" aria-labelledby="story-values-title">
            <div className="story-values-copy">
              <p className="story-kicker">Our Core Values</p>
              <h2 id="story-values-title">The Armoze<br /><span className="story-circle-word">way.</span></h2>
              <p>Meaningful ideas. Thoughtful details. A space that feels like you. These are the things that guide what we make.</p>
            </div>
            <div className="story-value-grid">
              {values.map((value, index) => (
                <button className="story-value-card" key={value.title} type="button" onClick={() => setActiveValue(index)} aria-label={value.title} aria-haspopup="dialog" aria-controls="story-value-dialog" style={{ '--value-color': value.color } as CSSProperties}>
                  <span className="story-value-image"><OptimizedRawImage src={value.image} alt={value.alt} fill sizes="(max-width: 760px) 76vw, 24vw" /></span>
                  <span className="story-value-caption"><span>{value.title}</span><span className="story-value-plus"><Plus size={19} strokeWidth={1.6} aria-hidden="true" /></span></span>
                </button>
              ))}
            </div>
          </section>

          <div className="story-outline-banner" aria-hidden="true">Make room for what matters. · Make room for what matters.</div>

          <section className="story-statement story-container" aria-label="What we believe">
            <span className="story-quote-mark" aria-hidden="true">“</span>
            <blockquote>Your space is part of your story.<br />Fill it with things that move you forward.</blockquote>
            <span className="brand-mark" aria-hidden="true" />
            <p>Armoze</p>
          </section>
        </div>

        <section className="story-history" id="our-history" aria-labelledby="story-history-title">
          <div className="story-container story-history-heading">
            <h2 id="story-history-title">Our History</h2>
            <div className="story-history-arrows">
              <button type="button" aria-label="Previous chapter" onClick={() => goToHistory(activeHistory - 1)} disabled={activeHistory === 0}><ArrowLeft size={20} aria-hidden="true" /></button>
              <button type="button" aria-label="Next chapter" onClick={() => goToHistory(activeHistory + 1)} disabled={activeHistory === history.length - 1}><ArrowRight size={20} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="story-history-track" ref={historyRef} onScroll={(event) => {
            const track = event.currentTarget;
            const cards = track.querySelectorAll<HTMLElement>('.story-history-card');
            if (cards.length < 2) return;
            const step = cards[1].offsetLeft - cards[0].offsetLeft;
            setActiveHistory(Math.max(0, Math.min(history.length - 1, Math.round(track.scrollLeft / step))));
          }}>
            {history.map((chapter, index) => (
              <article className={`story-history-card${activeHistory === index ? ' is-active' : ''}`} key={chapter.year} id={`story-chapter-${index}`} aria-label={`${chapter.year}: ${chapter.title}`}>
                {chapter.visual === 'storefront' ? (
                  <div className="story-history-image story-storefront-visual" role="img" aria-label={chapter.alt}>
                    <div className="story-laptop" aria-hidden="true">
                      <div className="story-laptop-display">
                        <div className="story-laptop-nav"><span className="brand-mark" /><span>Canvas with purpose.</span><span>Shop</span></div>
                        <div className="story-laptop-hero"><OptimizedRawImage src={chapter.image} alt="" fill sizes="(max-width: 760px) 75vw, 400px" /><span>Art for the life<br />you’re building.</span></div>
                        <div className="story-laptop-caption">ARMOZE<span>Made for your space.</span></div>
                      </div>
                      <div className="story-laptop-base" />
                    </div>
                  </div>
                ) : <div className="story-history-image"><OptimizedRawImage src={chapter.image} alt={chapter.alt} fill sizes="(max-width: 760px) 85vw, 480px" /></div>}
                <div className="story-history-copy"><p className="story-history-year">{chapter.year}</p><h3>{chapter.title}</h3><p>{chapter.body}</p></div>
              </article>
            ))}
          </div>
          <nav className="story-container story-timeline" aria-label="Our history chapters">
            {history.map((chapter, index) => <button key={chapter.year} type="button" onClick={() => goToHistory(index)} aria-current={activeHistory === index ? 'step' : undefined} aria-controls={`story-chapter-${index}`}>{chapter.year}<span /></button>)}
          </nav>
        </section>

        <section className="story-shop">
          <h2>Find your next reminder.</h2>
          <p>A piece of your story, ready for your wall.</p>
          <Link className="story-pill" href="/collections/best-sellers">Explore the collection <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>

      <dialog className="story-value-dialog" id="story-value-dialog" ref={dialogRef} aria-labelledby="story-value-dialog-title" onClose={() => setActiveValue(null)} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setActiveValue(null);
      }}>
        <button className="story-dialog-close" type="button" aria-label="Close value details" onClick={() => setActiveValue(null)} autoFocus><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
        {activeValue !== null ? <><h2 id="story-value-dialog-title">{values[activeValue].title}</h2>{values[activeValue].paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</> : null}
      </dialog>
    </StorefrontShell>
  );
}
