import { useMemo, useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Box,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { getProductBySlug, products, type Product } from './data/products';

type CartItem = {
  productId: string;
  quantity: number;
};

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

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);

function ProductVisual({ product }: { product: Product }) {
  return (
    <div className={`product-art ${product.tone}-art`}>
      {product.image ? <img src={product.image} alt={product.imageAlt} /> : <span>{product.label}</span>}
    </div>
  );
}

function SiteHeader({ cartCount }: { cartCount: number }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="No Rewind Art home">
        <span className="brand-mark">NR</span>
        <span>No Rewind Art</span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <Link to="/#collections">Collections</Link>
        <Link to="/#shop">Shop</Link>
        <Link to="/#story">Story</Link>
        <Link to="/#cart">Cart ({cartCount})</Link>
      </nav>
    </header>
  );
}

function HomePage({
  addToCart,
  cartProducts,
  subtotal,
  updateQuantity,
  startCheckout,
  checkoutState,
}: {
  addToCart: (productId: string) => void;
  cartProducts: Array<CartItem & { product: Product }>;
  subtotal: number;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
}) {
  const checkoutResult = new URLSearchParams(window.location.search).get('checkout');

  return (
    <main id="top">
      {checkoutResult === 'success' ? (
        <div className="checkout-banner success">Payment complete. Your order is being prepared.</div>
      ) : null}

      {checkoutResult === 'cancelled' ? (
        <div className="checkout-banner cancelled">
          Checkout was cancelled. Your cart is still here when you are ready.
        </div>
      ) : null}

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
            Motivational wall art built around focus, discipline, money mindset,
            and the future you are working toward.
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
          Built for bedrooms, offices, studios, dorms, gyms, and workspaces. Each
          collection gives the buyer a clear reason to connect with the print.
        </p>
      </section>

      <section className="collection-grid" aria-label="Collections">
        {collections.map((collection) => (
          <article className={`collection ${collection.tone}`} key={collection.title}>
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
            <article className="product" key={product.id}>
              <Link className="product-image-link" to={`/products/${product.slug}`}>
                <ProductVisual product={product} />
              </Link>
              <div className="product-copy">
                <div className="product-title-row">
                  <div>
                    <h3>
                      <Link to={`/products/${product.slug}`}>{product.title}</Link>
                    </h3>
                    <span>{product.size}</span>
                  </div>
                  <strong>{formatPrice(product.priceInCents)}</strong>
                </div>
                <p>{product.description}</p>
                <div className="product-actions">
                  <Link className="text-action" to={`/products/${product.slug}`}>
                    View Details
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                  <button className="text-action" type="button" onClick={() => addToCart(product.id)}>
                    Add to Cart
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CartSection
        cartProducts={cartProducts}
        subtotal={subtotal}
        updateQuantity={updateQuantity}
        startCheckout={startCheckout}
        checkoutState={checkoutState}
      />

      <section id="story" className="story-section">
        <div className="story-copy">
          <p className="eyebrow">The story</p>
          <h2>No rewind. Keep building.</h2>
          <p>
            No Rewind Art creates motivational canvas and poster prints for
            ambitious spaces. The work blends bold phrases, cinematic scenes,
            money mindset, and future-focused energy for people who are building,
            studying, training, creating, or starting again.
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
          <p className="eyebrow">Payment setup</p>
          <h2>Real checkout, without exposing your card system.</h2>
        </div>
        <p>
          This shop uses Stripe Checkout Sessions from a backend server. Your
          site owns the cart experience, and Stripe handles secure payment,
          billing details, and confirmation.
        </p>
        <a className="button button-primary" href="#cart">
          <Sparkles aria-hidden="true" size={18} />
          Review Cart
        </a>
      </section>
    </main>
  );
}

function CartSection({
  cartProducts,
  subtotal,
  updateQuantity,
  startCheckout,
  checkoutState,
}: {
  cartProducts: Array<CartItem & { product: Product }>;
  subtotal: number;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
}) {
  return (
    <section id="cart" className="cart-section">
      <div className="cart-copy">
        <p className="eyebrow">Checkout</p>
        <h2>Your Cart</h2>
        <p>
          Choose your prints here, then complete payment securely through Stripe
          Checkout. Shipping, tax, and payment details are handled at checkout.
        </p>
      </div>

      <aside className="cart-panel" aria-label="Shopping cart">
        {cartProducts.length ? (
          <>
            <div className="cart-items">
              {cartProducts.map(({ product, quantity }) => (
                <div className="cart-item" key={product.id}>
                  <div>
                    <h3>{product.title}</h3>
                    <p>
                      {product.size} · {formatPrice(product.priceInCents)}
                    </p>
                  </div>
                  <div className="quantity-controls">
                    <button
                      type="button"
                      aria-label={`Decrease ${product.title} quantity`}
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                    >
                      {quantity === 1 ? (
                        <Trash2 aria-hidden="true" size={16} />
                      ) : (
                        <Minus aria-hidden="true" size={16} />
                      )}
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${product.title} quantity`}
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                    >
                      <Plus aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <button
              className="button button-primary checkout-button"
              type="button"
              disabled={checkoutState === 'loading'}
              onClick={startCheckout}
            >
              <ShoppingBag aria-hidden="true" size={18} />
              {checkoutState === 'loading' ? 'Opening Checkout' : 'Secure Checkout'}
            </button>

            {checkoutState === 'error' ? (
              <p className="checkout-error">
                Checkout is not connected yet. Add your Stripe keys in `.env` and
                restart the dev server.
              </p>
            ) : null}
          </>
        ) : (
          <div className="empty-cart">
            <ShoppingBag aria-hidden="true" size={34} />
            <h3>Your cart is empty</h3>
            <p>Add a print from the first drop to start checkout.</p>
            <a className="button button-secondary" href="/#shop">
              Browse Prints
            </a>
          </div>
        )}
      </aside>
    </section>
  );
}

function ProductPage({ addToCart }: { addToCart: (productId: string) => void }) {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [selectedSize, setSelectedSize] = useState(2);
  const [detailsOpen, setDetailsOpen] = useState(true);

  if (!product) {
    return (
      <main className="product-not-found">
        <p className="eyebrow">Product missing</p>
        <h1>Print not found.</h1>
        <Link className="button button-primary" to="/#shop">
          Back to Shop
        </Link>
      </main>
    );
  }

  const gallery = product.gallery.length ? product.gallery : [];
  const selectedOption = product.sizeOptions[selectedSize] ?? product.sizeOptions[0];

  return (
    <main className="product-page">
      <div className="product-page-header">
        <Link className="back-link" to="/#shop">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to Shop
        </Link>
      </div>

      <section className="listing-layout">
        <div className="listing-gallery">
          <div className="gallery-rail" aria-label="Product images">
            {(gallery.length ? gallery : ['placeholder']).map((image, index) => (
              <button
                className={index === selectedImage ? 'active' : ''}
                key={`${product.id}-${index}`}
                type="button"
                onClick={() => setSelectedImage(index)}
                aria-label={`View ${product.title} image ${index + 1}`}
              >
                {image === 'placeholder' ? (
                  <ProductVisual product={product} />
                ) : (
                  <img src={image} alt="" />
                )}
              </button>
            ))}
          </div>

          <div className="main-product-image">
            {gallery[selectedImage] ? (
              <img src={gallery[selectedImage]} alt={product.imageAlt} />
            ) : (
              <ProductVisual product={product} />
            )}
          </div>
        </div>

        <aside className="listing-panel">
          <div className="rating-row">
            <span>{product.rating.toFixed(2)}</span>
            <span className="stars" aria-label={`${product.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star aria-hidden="true" fill="currentColor" key={index} size={14} />
              ))}
            </span>
            <small>{product.reviewCount.toLocaleString()} reviews</small>
          </div>

          <p className="listing-kicker">No Rewind Original</p>
          <h1>{product.title}</h1>
          <p className="listing-price">{formatPrice(selectedOption.priceInCents)}</p>
          <p className="listing-description">{product.longDescription}</p>

          <div className="option-group">
            <div className="option-label">
              <span>Framing Options:</span>
              <strong>{product.framingOptions[selectedFrame]}</strong>
            </div>
            <div className="frame-options">
              {product.framingOptions.map((option, index) => (
                <button
                  className={index === selectedFrame ? 'selected' : ''}
                  key={option}
                  type="button"
                  onClick={() => setSelectedFrame(index)}
                  aria-label={`Select ${option}`}
                >
                  <span>{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <div className="option-label">
              <span>Size:</span>
              <strong>{selectedOption.label}</strong>
            </div>
            <div className="size-options">
              {product.sizeOptions.map((option, index) => (
                <button
                  className={index === selectedSize ? 'selected' : ''}
                  key={option.label}
                  type="button"
                  onClick={() => setSelectedSize(index)}
                >
                  {option.badge ? <span>{option.badge}</span> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="installment-note">
            Pay in 4 interest-free installments with Stripe-compatible payment methods at checkout.
          </div>

          <button className="button button-primary listing-cart-button" type="button" onClick={() => addToCart(product.id)}>
            Add to Cart
          </button>

          <Link className="button button-secondary listing-cart-button" to="/#cart">
            Review Cart
          </Link>

          <div className="trust-grid">
            <div>
              <Box aria-hidden="true" size={24} />
              <span>Free Shipping</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" size={24} />
              <span>Secure Checkout</span>
            </div>
            <div>
              <BadgeCheck aria-hidden="true" size={24} />
              <span>Made To Order</span>
            </div>
          </div>

          <div className="details-accordion">
            <button type="button" onClick={() => setDetailsOpen((open) => !open)}>
              Product Details
              <span>{detailsOpen ? '−' : '+'}</span>
            </button>
            {detailsOpen ? (
              <ul>
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return product ? { ...item, product } : null;
        })
        .filter((item): item is CartItem & { product: Product } => Boolean(item)),
    [cart],
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartProducts.reduce(
    (total, item) => total + item.product.priceInCents * item.quantity,
    0,
  );

  function addToCart(productId: string) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === productId);

      if (!existing) {
        return [...currentCart, { productId, quantity: 1 }];
      }

      return currentCart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
          : item,
      );
    });
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, Math.min(nextQuantity, 10)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function startCheckout() {
    if (!cart.length) {
      return;
    }

    setCheckoutState('loading');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Checkout request failed');
      }

      const data = (await response.json()) as { url?: string };

      if (!data.url) {
        throw new Error('Checkout URL missing');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      setCheckoutState('error');
    }
  }

  return (
    <>
      <SiteHeader cartCount={cartCount} />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              addToCart={addToCart}
              cartProducts={cartProducts}
              subtotal={subtotal}
              updateQuantity={updateQuantity}
              startCheckout={startCheckout}
              checkoutState={checkoutState}
            />
          }
        />
        <Route path="/products/:slug" element={<ProductPage addToCart={addToCart} />} />
      </Routes>
    </>
  );
}

export default App;
