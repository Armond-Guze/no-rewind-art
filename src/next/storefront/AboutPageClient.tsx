'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, Focus, PackageCheck, Sparkles } from 'lucide-react';
import type { Product } from '../../data/products';
import { OptimizedRawImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

const processSteps = [
  {
    index: '01',
    title: 'Made for your space',
    body: 'Each design is built to hold attention from across a room while keeping the artwork clear up close.',
    image: '/product-support/what-arrives-canvas-detail-v2.jpg',
    alt: 'Close view of Armoze canvas texture and a finished wrapped edge',
  },
  {
    index: '02',
    title: 'Finished to order',
    body: 'Your selection is produced in the size and framing combination you choose, then prepared for the wall.',
    image: '/product-support/what-arrives-ready-to-hang-v2.jpg',
    alt: 'Finished gallery-wrapped canvas being positioned on a wall',
  },
  {
    index: '03',
    title: 'Protected in transit',
    body: 'The surface, corners, and back are packed with care so the canvas arrives ready for its place in your room.',
    image: '/product-support/what-arrives-packaging-v2.jpg',
    alt: 'Canvas packed with protective wrapping and corner protection',
  },
];

const brandPrinciples = [
  {
    title: 'Focused by design',
    body: 'Clear ideas, strong typography, and artwork that gives a room direction.',
    icon: Focus,
  },
  {
    title: 'Ready for real life',
    body: 'Made-to-order canvas options that arrive stretched and ready to hang.',
    icon: PackageCheck,
  },
  {
    title: 'Details matter',
    body: 'Thoughtful scale, crisp color, finished edges, and packaging built around the product.',
    icon: Sparkles,
  },
];

export default function AboutPageClient({
  allProducts,
  featuredProduct,
}: {
  allProducts: Product[];
  featuredProduct: Product;
}) {
  const heroImage =
    featuredProduct.gallery?.[3] ||
    featuredProduct.gallery?.[2] ||
    featuredProduct.gallery?.[0] ||
    featuredProduct.image;

  return (
    <StorefrontShell products={allProducts}>
      <StorefrontTracker />
      <main className="about-page">
        <section className="about-hero" aria-labelledby="about-title">
          {heroImage ? (
            <OptimizedRawImage
              className="about-hero-image"
              src={heroImage}
              alt={`${featuredProduct.title} canvas displayed in an Armoze room setting`}
              fill
              priority
              sizes="100vw"
            />
          ) : null}
          <div className="about-hero-shade" aria-hidden="true" />
          <div className="about-hero-copy">
            <p className="eyebrow">Our story</p>
            <h1 id="about-title">Armoze</h1>
            <p>Artwork for the rooms where you build your life.</p>
            <Link className="button button-primary" href="/collections/best-sellers">
              Shop the collection <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </section>

        <section className="about-origin" aria-labelledby="about-origin-title">
          <div>
            <p className="eyebrow">Why Armoze exists</p>
            <h2 id="about-origin-title">Your walls are part of your routine.</h2>
          </div>
          <div className="about-origin-copy">
            <p>
              Armoze started with a simple idea: walls can do more than fill space. The words,
              objects, and images you see every day can pull your attention back to what matters.
            </p>
            <p>
              We create motivational canvas artwork for bedrooms, offices, studios, and focused
              spaces. The goal is not decoration for decoration&apos;s sake. It is a room that feels
              more personal, more intentional, and more like the direction you are moving in.
            </p>
          </div>
        </section>

        <section className="about-principles" aria-labelledby="about-principles-title">
          <header>
            <p className="eyebrow">What guides us</p>
            <h2 id="about-principles-title">Built around the everyday view.</h2>
          </header>
          <div className="about-principle-grid">
            {brandPrinciples.map((principle) => {
              const Icon = principle.icon;

              return (
                <article key={principle.title}>
                  <Icon aria-hidden="true" size={22} />
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-process" aria-labelledby="about-process-title">
          <header>
            <p className="eyebrow">From selection to wall</p>
            <h2 id="about-process-title">Made to arrive ready.</h2>
            <p>Choose the artwork, size, and finish. The rest is handled before it reaches you.</p>
          </header>
          <div className="about-process-grid">
            {processSteps.map((step) => (
              <article key={step.index}>
                <div className="about-process-image">
                  <OptimizedRawImage src={step.image} alt={step.alt} fill sizes="(max-width: 760px) 92vw, 34vw" />
                </div>
                <div>
                  <span>{step.index}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-promise" aria-labelledby="about-promise-title">
          <div>
            <p className="eyebrow">The Armoze promise</p>
            <h2 id="about-promise-title">Clear choices. Careful delivery. Real support.</h2>
          </div>
          <ul>
            <li><Check aria-hidden="true" size={17} /> Free U.S. shipping</li>
            <li><Check aria-hidden="true" size={17} /> 30-day returns</li>
            <li><Check aria-hidden="true" size={17} /> Damage and replacement support</li>
            <li><Check aria-hidden="true" size={17} /> Replies within one business day</li>
          </ul>
          <div className="about-promise-actions">
            <Link className="button button-primary" href="/collections/new-arrivals">See new arrivals</Link>
            <Link className="button button-secondary" href="/support">Contact support</Link>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
