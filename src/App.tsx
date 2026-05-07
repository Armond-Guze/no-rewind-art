import { ArrowUpRight, Sparkles } from 'lucide-react';

const etsyListingUrl = 'https://www.etsy.com/listing/1666839752';

const collections = [
  {
    number: '01',
    title: 'Money & Ambition',
    text: 'For entrepreneurs, creators, and anyone building a bigger future.',
    tone: 'money',
  },
  {
    number: '02',
    title: 'Discipline & Focus',
    text: 'Clean reminders for offices, bedrooms, studios, and gym spaces.',
    tone: 'discipline',
  },
  {
    number: '03',
    title: 'Space & Future',
    text: 'Cinematic prints for dreamers, students, and people starting over.',
    tone: 'future',
  },
];

const products = [
  {
    title: 'Life Has No Rewind',
    description: 'Canvas and poster print for rooms that need a daily reset.',
    className: 'cassette-art',
    label: 'Life Has No Rewind',
  },
  {
    title: 'Focus Is The Price',
    description: 'Bold wall art for offices, studios, and serious workspaces.',
    className: 'focus-art',
    label: 'Focus',
  },
  {
    title: 'Keep Going',
    description: 'Cinematic space-inspired print for bedrooms and dorm rooms.',
    className: 'space-art',
    label: 'Keep Going',
  },
];

function App() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="No Rewind Art home">
          <span className="brand-mark">NR</span>
          <span>No Rewind Art</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#collections">Collections</a>
          <a href="#shop">Shop</a>
          <a href="#story">Story</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-art" aria-hidden="true">
            <div className="poster poster-money">
              <span>ATM</span>
              <strong>MONEY IS ENERGY</strong>
            </div>
            <div className="poster poster-cassette">
              <span>LIFE HAS NO REWIND</span>
              <strong>ENJOY EVERY MOMENT</strong>
            </div>
            <div className="poster poster-space">
              <span>KEEP GOING</span>
              <strong>THE FUTURE IS LOADING</strong>
            </div>
            <div className="poster poster-focus">
              <span>FOCUS</span>
              <strong>THE PRICE OF ACHIEVEMENT</strong>
            </div>
          </div>

          <div className="hero-copy">
            <p className="eyebrow">Canvas prints for ambitious spaces</p>
            <h1 id="hero-title">No Rewind Art</h1>
            <p>
              Motivational wall art built around focus, discipline, money
              mindset, and the future you are working toward.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#shop">
                Shop Prints
                <ArrowUpRight aria-hidden="true" size={18} />
              </a>
              <a className="button button-secondary" href="#collections">
                View Collections
              </a>
            </div>
          </div>
        </section>

        <section id="collections" className="section intro-section">
          <div>
            <p className="eyebrow">Brand direction</p>
            <h2>Art for the room where you become different.</h2>
          </div>
          <p>
            Built for bedrooms, offices, studios, dorms, gyms, and workspaces.
            Each collection gives the buyer a clear reason to connect with the
            print.
          </p>
        </section>

        <section className="collection-grid" aria-label="Collections">
          {collections.map((collection) => (
            <article
              className={`collection ${collection.tone}`}
              key={collection.title}
            >
              <span>{collection.number}</span>
              <h3>{collection.title}</h3>
              <p>{collection.text}</p>
            </article>
          ))}
        </section>

        <section id="shop" className="section shop-section">
          <div className="section-heading">
            <p className="eyebrow">First drop</p>
            <h2>No Rewind: Volume 1</h2>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article className="product" key={product.title}>
                <div className={`product-art ${product.className}`}>
                  <span>{product.label}</span>
                </div>
                <div className="product-copy">
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>
                  <a href={etsyListingUrl} aria-label={`Shop ${product.title} on Etsy`}>
                    Shop on Etsy
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="story" className="story-section">
          <div className="story-copy">
            <p className="eyebrow">The story</p>
            <h2>No rewind. Keep building.</h2>
            <p>
              No Rewind Art creates motivational canvas and poster prints for
              ambitious spaces. The work blends bold phrases, cinematic scenes,
              money mindset, and future-focused energy for people who are
              building, studying, training, creating, or starting again.
            </p>
          </div>
          <div className="story-panel">
            <span>Brand Pillars</span>
            <ul>
              <li>Focus</li>
              <li>Discipline</li>
              <li>Momentum</li>
              <li>Ambition</li>
            </ul>
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Start with Etsy checkout. Build the brand here.</h2>
          </div>
          <p>
            Replace the sample buttons with your Etsy listing links, connect
            your print-on-demand provider, then use this site as the home base
            for your art brand.
          </p>
          <a className="button button-primary" href={etsyListingUrl}>
            <Sparkles aria-hidden="true" size={18} />
            Shop the Etsy Store
          </a>
        </section>
      </main>
    </>
  );
}

export default App;
