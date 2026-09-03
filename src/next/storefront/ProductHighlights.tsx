import { Frame, Layers } from 'lucide-react';
import { OptimizedRawImage } from './OptimizedArtwork';
import './product-highlights.css';

const highlights = [
  {
    id: 'ready-for-your-wall',
    title: 'Ready for your wall',
    description: 'Your canvas arrives stretched over a wooden frame and ready to hang. Choose your spot, find the right light, and bring a little more purpose to the room. From your workspace to your favorite corner, it’s ready to make itself at home.',
    image: '/product-support/canvas-ready-for-wall-v1.webp',
    alt: 'Natural wooden stretcher bars and neatly folded canvas edges in a softly lit interior',
    Icon: Frame,
  },
  {
    id: 'detail-in-every-edge',
    title: 'Detail in every edge',
    description: 'Look a little closer. Fine woven texture, crisp printed detail, and a smooth matte finish bring the artwork to life. With cleanly wrapped edges and a carefully finished corner, your canvas looks good from every angle.',
    image: '/product-support/canvas-matte-detail-v1.webp',
    alt: 'Close-up of fine matte canvas weave and a precisely wrapped black and ivory printed corner',
    Icon: Layers,
  },
];

export default function ProductHighlights() {
  return (
    <section className="product-highlights" id="product-highlights" aria-label="Canvas quality and finish">
      <div className="product-highlights-inner">
        {highlights.map(({ id, title, description, image, alt, Icon }) => (
          <article className="product-highlight" key={id} aria-labelledby={`${id}-title`}>
            <div className="product-highlight-media">
              <OptimizedRawImage src={image} alt={alt} fill sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1600px) 45vw, 720px" />
            </div>
            <div className="product-highlight-copy">
              <span className="product-highlight-icon" aria-hidden="true"><Icon size={32} strokeWidth={1.4} /></span>
              <h2 id={`${id}-title`}>{title}</h2>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
