import { useMemo, useState } from 'react';
import { ArrowUpRight, Minus, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { products, type Product } from './data/products';

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

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');
  const checkoutResult = new URLSearchParams(window.location.search).get('checkout');

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
      <header className="site-header">
        <a className="brand" href="#top" aria-label="No Rewind Art home">
          <span className="brand-mark">NR</span>
          <span>No Rewind Art</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#collections">Collections</a>
          <a href="#shop">Shop</a>
          <a href="#story">Story</a>
          <a href="#cart">Cart ({cartCount})</a>
        </nav>
      </header>

      <main id="top">
        {checkoutResult === 'success' ? (
          <div className="checkout-banner success">
            Payment complete. Your order is being prepared.
          </div>
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
              <article className="product" key={product.id}>
                <div className={`product-art ${product.tone}-art`}>
                  {product.image ? (
                    <img src={product.image} alt={product.imageAlt} />
                  ) : (
                    <span>{product.label}</span>
                  )}
                </div>
                <div className="product-copy">
                  <div className="product-title-row">
                    <div>
                      <h3>{product.title}</h3>
                      <span>{product.size}</span>
                    </div>
                    <strong>{formatPrice(product.priceInCents)}</strong>
                  </div>
                  <p>{product.description}</p>
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => addToCart(product.id)}
                  >
                    Add to Cart
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="cart" className="cart-section">
          <div className="cart-copy">
            <p className="eyebrow">Checkout</p>
            <h2>Your Cart</h2>
            <p>
              Choose your prints here, then complete payment securely through
              Stripe Checkout. Shipping, tax, and payment details are handled at
              checkout.
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
                    Checkout is not connected yet. Add your Stripe keys in
                    `.env` and restart the dev server.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="empty-cart">
                <ShoppingBag aria-hidden="true" size={34} />
                <h3>Your cart is empty</h3>
                <p>Add a print from the first drop to start checkout.</p>
                <a className="button button-secondary" href="#shop">
                  Browse Prints
                </a>
              </div>
            )}
          </aside>
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
    </>
  );
}

export default App;
