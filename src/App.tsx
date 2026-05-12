import { useMemo, useState, type CSSProperties } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Box,
  Filter,
  Grid2X2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import {
  collections,
  getCollectionBySlug,
  getProductBySlug,
  getProductsForCollection,
  products,
  type Product,
  type SizeOption,
} from './data/products';

type CartItem = {
  lineKey: string;
  productId: string;
  sizeId: string;
  quantity: number;
};

type CartLine = CartItem & {
  product: Product;
  sizeOption: SizeOption;
};

type AddToCart = (productId: string, sizeId?: string) => void;

const missingImages = new Set<string>();

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);

function makeCartLineKey(productId: string, sizeId: string) {
  return `${productId}::${sizeId}`;
}

function getBaseSizeOption(product: Product) {
  return product.sizeOptions[0];
}

function getFeaturedSizeOption(product: Product) {
  return (
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}

function getSizeOption(product: Product, sizeId: string) {
  return product.sizeOptions.find((option) => option.id === sizeId) ?? getBaseSizeOption(product);
}

function ProductVisual({ product }: { product: Product }) {
  return (
    <div className={`product-art ${product.tone}-art shape-${product.artworkShape}`}>
      {product.image ? <img src={product.image} alt={product.imageAlt} /> : <span>{product.label}</span>}
    </div>
  );
}

function ProductImage({ product }: { product: Product }) {
  if (product.image) {
    return <ArtworkMockup product={product} src={product.image} alt={product.imageAlt} />;
  }

  return <ProductVisual product={product} />;
}

function ArtworkMockup({
  product,
  src,
  alt,
  className,
}: {
  product: Product;
  src?: string;
  alt: string;
  className?: string;
}) {
  const classNames = ['artwork-mockup', `shape-${product.artworkShape}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <div className="artwork-mockup-print">
        {src ? (
          <GalleryImage className="artwork-mockup-image" src={src} alt={alt} />
        ) : (
          <ProductVisual product={product} />
        )}
      </div>
    </div>
  );
}

function GalleryImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hidden, setHidden] = useState(missingImages.has(src));

  if (hidden) {
    return null;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => {
        missingImages.add(src);
        setHidden(true);
      }}
    />
  );
}

function getProductGallery(product: Product) {
  return [product.image, ...(product.gallery ?? [])].filter(
    (image, index, gallery): image is string => Boolean(image) && gallery.indexOf(image) === index,
  );
}

function isProductMockupImage(product: Product, image: string | undefined) {
  if (!image) {
    return false;
  }

  return (
    image === product.image ||
    /\/0[12]-(main|side)\.(png|jpe?g|webp|avif)$/i.test(image)
  );
}

function isSideMockupImage(image: string | undefined) {
  return /\/02-side\.(png|jpe?g|webp|avif)$/i.test(image ?? '');
}

function SiteHeader({ cartCount }: { cartCount: number }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Armoze home">
        <img className="brand-mark" src="/armoze-logo.png" alt="" aria-hidden="true" />
        <span>Armoze</span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <Link to="/collections/best-sellers">Best Sellers</Link>
        <Link to="/collections/money-ambition">Money</Link>
        <Link to="/collections/discipline-focus">Focus</Link>
        <Link to="/collections/new-arrivals">New Arrivals</Link>
        <Link to="/#story">Story</Link>
        <Link to="/cart">Cart ({cartCount})</Link>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link className="footer-logo" to="/" aria-label="Armoze home">
          <img className="brand-mark" src="/armoze-logo.png" alt="" aria-hidden="true" />
          <span>Armoze</span>
        </Link>
        <p>Motivational canvas prints for ambitious spaces.</p>
      </div>

      <nav className="footer-links" aria-label="Footer navigation">
        <Link to="/collections/best-sellers">Best Sellers</Link>
        <Link to="/collections/money-ambition">Money</Link>
        <Link to="/collections/discipline-focus">Focus</Link>
        <Link to="/collections/new-arrivals">New Arrivals</Link>
      </nav>

      <div className="footer-bottom">
        <span>2026 Armoze</span>
        <span>Made to order</span>
        <span>Secure checkout</span>
      </div>
    </footer>
  );
}

function HomePage({
  addToCart,
  cartProducts,
  subtotal,
  updateQuantity,
  startCheckout,
  checkoutState,
  checkoutError,
}: {
  addToCart: AddToCart;
  cartProducts: CartLine[];
  subtotal: number;
  updateQuantity: (lineKey: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
  checkoutError: string;
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
          <h1 id="hero-title">Armoze</h1>
          <p>
            Motivational wall art built around focus, discipline, money mindset,
            and the future you are working toward.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/collections/best-sellers">
              Shop Prints
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
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
        {collections.slice(1, 4).map((collection, index) => (
          <Link
            className={`collection ${index === 0 ? 'money' : index === 1 ? 'discipline' : 'future'}`}
            key={collection.slug}
            to={`/collections/${collection.slug}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{collection.title}</h3>
            <p>{collection.description}</p>
          </Link>
        ))}
      </section>

      <section id="shop" className="section shop-section">
        <div className="section-heading">
          <p className="eyebrow">First drop</p>
          <h2>Armoze: Volume 1</h2>
          <Link className="section-link" to="/collections/best-sellers">
            View All Prints
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <article className="product" key={product.id}>
              <Link className="product-image-link" to={`/products/${product.slug}`}>
                <ProductImage product={product} />
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
        checkoutError={checkoutError}
      />

      <section id="story" className="story-section">
        <div className="story-copy">
          <p className="eyebrow">The story</p>
          <h2>Armoze. Keep building.</h2>
          <p>
            Armoze creates motivational canvas and poster prints for
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
        <Link className="button button-primary" to="/cart">
          <Sparkles aria-hidden="true" size={18} />
          Review Cart
        </Link>
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
  checkoutError,
}: {
  cartProducts: CartLine[];
  subtotal: number;
  updateQuantity: (lineKey: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
  checkoutError: string;
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
              {cartProducts.map(({ lineKey, product, quantity, sizeOption }) => (
                <div className="cart-item" key={lineKey}>
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
                      onClick={() => updateQuantity(lineKey, quantity - 1)}
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
                      onClick={() => updateQuantity(lineKey, quantity + 1)}
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
                {checkoutError || 'Checkout could not be started. Check your Stripe settings and try again.'}
              </p>
            ) : null}
          </>
        ) : (
          <div className="empty-cart">
            <ShoppingBag aria-hidden="true" size={34} />
            <h3>Your cart is empty</h3>
            <p>Add a print from the first drop to start checkout.</p>
            <Link className="button button-secondary" to="/collections/best-sellers">
              Browse Prints
            </Link>
          </div>
        )}
      </aside>
    </section>
  );
}

function CartPage({
  cartProducts,
  subtotal,
  updateQuantity,
  startCheckout,
  checkoutState,
  checkoutError,
}: {
  cartProducts: CartLine[];
  subtotal: number;
  updateQuantity: (lineKey: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
  checkoutError: string;
}) {
  return (
    <main className="standalone-cart-page">
      <CartSection
        cartProducts={cartProducts}
        subtotal={subtotal}
        updateQuantity={updateQuantity}
        startCheckout={startCheckout}
        checkoutState={checkoutState}
        checkoutError={checkoutError}
      />
    </main>
  );
}

function CollectionPage({ addToCart }: { addToCart: AddToCart }) {
  const { slug } = useParams();
  const collection = getCollectionBySlug(slug);
  const collectionProducts = getProductsForCollection(slug);

  if (!collection) {
    return (
      <main className="product-not-found">
        <p className="eyebrow">Collection missing</p>
        <h1>Category not found.</h1>
        <Link className="button button-primary" to="/collections/best-sellers">
          View Best Sellers
        </Link>
      </main>
    );
  }

  return (
    <main className="collection-page">
      <section className="collection-toolbar" aria-label="Shop category controls">
        <div className="product-count">{collectionProducts.length} Products</div>
        <nav className="collection-tabs" aria-label="Shop categories">
          {collections.map((item) => (
            <Link
              className={item.slug === collection.slug ? 'active' : ''}
              key={item.slug}
              to={`/collections/${item.slug}`}
            >
              {item.navLabel}
            </Link>
          ))}
        </nav>
        <div className="view-controls" aria-label="View controls">
          <Grid2X2 aria-hidden="true" size={18} />
          <span />
          <Filter aria-hidden="true" size={16} />
          <button type="button">Filter & Sort</button>
        </div>
      </section>

      <section className="collection-heading">
        <p className="eyebrow">Shop Prints</p>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </section>

      <section className="listing-grid" aria-label={`${collection.title} products`}>
        {collectionProducts.map((product) => (
          <article className="listing-card" key={product.id}>
            <Link className="listing-card-image" to={`/products/${product.slug}`}>
              <ProductImage product={product} />
            </Link>
            <div className="listing-card-copy">
              <div>
                <h2>
                  <Link to={`/products/${product.slug}`}>{product.title}</Link>
                </h2>
                <p>From {formatPrice(product.priceInCents)}</p>
              </div>
              <button
                className="quick-add"
                type="button"
                onClick={() => addToCart(product.id)}
                aria-label={`Add ${product.title} to cart`}
              >
                <Plus aria-hidden="true" size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function ProductPage({ addToCart }: { addToCart: AddToCart }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const product = getProductBySlug(slug);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
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

  const gallery = getProductGallery(product);
  const selectedGalleryImage = gallery[selectedImage];
  const isMockupGalleryImage = isProductMockupImage(product, selectedGalleryImage);
  const isSideGalleryImage = isSideMockupImage(selectedGalleryImage);
  const isFrontMockupGalleryImage = isMockupGalleryImage && !isSideGalleryImage;
  const defaultSizeOption = getFeaturedSizeOption(product);
  const selectedOption =
    product.sizeOptions.find((option) => option.id === selectedSizeId) ?? defaultSizeOption;
  const selectedSize = product.sizeOptions.findIndex((option) => option.id === selectedOption.id);
  const selectedFrameName = product.framingOptions[selectedFrame] ?? product.framingOptions[0];
  const frameClass =
    selectedFrameName === 'Black Frame'
      ? 'frame-black'
      : selectedFrameName === 'White Frame'
        ? 'frame-white'
        : 'frame-none';
  const sizeScale = selectedOption.previewScale ?? 0.94 + Math.max(selectedSize, 0) * 0.045;

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
                  <GalleryImage src={image} alt="" />
                )}
              </button>
            ))}
          </div>

          <div className={`main-product-image ${isMockupGalleryImage ? 'mockup-product-image' : ''}`}>
            <div
              className={`detail-artwork-shell ${frameClass} shape-${product.artworkShape} ${
                isMockupGalleryImage ? 'mockup-product-shell' : ''
              } ${isFrontMockupGalleryImage ? 'front-product-shell' : ''} ${
                isSideGalleryImage ? 'side-product-shell' : ''
              }`}
              style={{ '--size-scale': sizeScale } as CSSProperties}
            >
              <div className="detail-artwork-surface">
                {selectedGalleryImage ? (
                  <GalleryImage
                    className="detail-artwork-image"
                    src={selectedGalleryImage}
                    alt={product.imageAlt}
                  />
                ) : (
                  <ProductVisual product={product} />
                )}
              </div>
            </div>
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

          <p className="listing-kicker">Armoze Original</p>
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
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedSizeId(option.id)}
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

          <button
            className="button button-primary listing-cart-button"
            type="button"
            onClick={() => {
              addToCart(product.id, selectedOption.id);
              navigate('/cart');
            }}
          >
            Add to Cart
          </button>

          <Link className="button button-secondary listing-cart-button" to="/cart">
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
  const [checkoutError, setCheckoutError] = useState('');

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          if (!product) {
            return null;
          }

          const sizeOption = getSizeOption(product, item.sizeId);
          return { ...item, product, sizeOption };
        })
        .filter((item): item is CartLine => Boolean(item)),
    [cart],
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartProducts.reduce(
    (total, item) => total + item.sizeOption.priceInCents * item.quantity,
    0,
  );

  function addToCart(productId: string, sizeId?: string) {
    const product = products.find((candidate) => candidate.id === productId);

    if (!product) {
      return;
    }

    const sizeOption = sizeId ? getSizeOption(product, sizeId) : getBaseSizeOption(product);
    const lineKey = makeCartLineKey(productId, sizeOption.id);

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.lineKey === lineKey);

      if (!existing) {
        return [...currentCart, { lineKey, productId, sizeId: sizeOption.id, quantity: 1 }];
      }

      return currentCart.map((item) =>
        item.lineKey === lineKey
          ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
          : item,
      );
    });
  }

  function updateQuantity(lineKey: string, nextQuantity: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.lineKey === lineKey
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
    setCheckoutError('');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.productId,
            sizeId: item.sizeId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || 'Checkout request failed');
      }

      const data = (await response.json()) as { url?: string };

      if (!data.url) {
        throw new Error('Checkout URL missing');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      setCheckoutError(error instanceof Error ? error.message : 'Checkout request failed');
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
              checkoutError={checkoutError}
            />
          }
        />
        <Route
          path="/collections/:slug"
          element={<CollectionPage addToCart={addToCart} />}
        />
        <Route
          path="/cart"
          element={
            <CartPage
              cartProducts={cartProducts}
              subtotal={subtotal}
              updateQuantity={updateQuantity}
              startCheckout={startCheckout}
              checkoutState={checkoutState}
              checkoutError={checkoutError}
            />
          }
        />
        <Route path="/products/:slug" element={<ProductPage addToCart={addToCart} />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

export default App;
