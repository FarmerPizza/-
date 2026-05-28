/* ============================================
   FARMER PIZZA — MAIN SCRIPTS
   Cart (sessionStorage), WhatsApp checkout,
   Nav menu, interactions, animations
   ============================================ */

(function () {
  'use strict';

  // ============================================
  // 1. CONFIGURATION
  // ============================================

  // # change whatsapp-number here (include country code, no + or spaces)
  var PHONE_NUMBER = '919286175004';

  // # change free-delivery-threshold here (in dollars)
  var FREE_DELIVERY_THRESHOLD = 299;

  // # change shop-location here (latitude, longitude)
  // Coordinates extracted from: https://maps.app.goo.gl/hPDTuCM2B3fGc8yQ8?g_st=ac
  var SHOP_LOCATION = { lat: 29.3279995, lng: 77.851953 };

  // # change delivery-rate-per-meter here
  var RATE_PER_METER = 0.015;

  // # change max-delivery-distance-meters here
  var MAX_DELIVERY_DISTANCE = 5000;

  // # change shop-name here
  var SHOP_NAME = 'Farmer Pizza';

  // # change shop-delivery-origin here (Google Maps link for delivery origin)
  var SHOP_DELIVERY_ORIGIN = 'https://maps.app.goo.gl/hPDTuCM2B3fGc8yQ8?g_st=ac';

  // ============================================
  // 2. CART STATE (sessionStorage)
  // ============================================

  var userLocation = null;
  var distanceMeters = 0;

  // Allowed cart item property names (whitelist for safety)
  var ALLOWED_ITEM_KEYS = ['id', 'name', 'price', 'image', 'tags', 'parent', 'qty'];

  function sanitizeText(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getCart() {
    try {
      var raw = JSON.parse(sessionStorage.getItem('farmer_pizza_cart') || '[]');
      // Validate: only allow plain objects with known keys
      if (!Array.isArray(raw)) return [];
      var safe = [];
      raw.forEach(function (entry) {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          var cleaned = {};
          if (Object.prototype.hasOwnProperty.call(entry, 'id')) cleaned.id = entry.id;
          if (Object.prototype.hasOwnProperty.call(entry, 'name')) cleaned.name = entry.name;
          if (Object.prototype.hasOwnProperty.call(entry, 'price')) cleaned.price = entry.price;
          if (Object.prototype.hasOwnProperty.call(entry, 'image')) cleaned.image = entry.image;
          if (Object.prototype.hasOwnProperty.call(entry, 'tags')) cleaned.tags = entry.tags;
          if (Object.prototype.hasOwnProperty.call(entry, 'parent')) cleaned.parent = entry.parent;
          if (Object.prototype.hasOwnProperty.call(entry, 'qty')) cleaned.qty = entry.qty;
          if (cleaned.id && cleaned.name && typeof cleaned.price === 'number') {
            safe.push(cleaned);
          }
        }
      });
      return safe;
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    sessionStorage.setItem('farmer_pizza_cart', JSON.stringify(cart));
  }

  // ============================================
  // 3. DOM REFERENCES (safe — checks if element exists)
  // ============================================

  var cartSidebar = document.getElementById('cart-sidebar');
  var cartOverlay = document.getElementById('cart-overlay');
  var cartToggleBtn = document.getElementById('cart-toggle-btn');
  var cartCloseBtn = document.getElementById('cart-close-btn');
  var cartBadge = document.getElementById('cart-badge');
  var cartItemsContainer = document.getElementById('cart-items');
  var cartEmpty = document.getElementById('cart-empty');
  var cartFooter = document.getElementById('cart-footer');
  var cartSubtotal = document.getElementById('cart-subtotal');
  var cartDelivery = document.getElementById('cart-delivery');
  var cartTotal = document.getElementById('cart-total');
  var deliveryProgress = document.getElementById('delivery-progress');
  var deliveryNudgeLabel = document.getElementById('delivery-nudge-label');
  var siteHeader = document.getElementById('site-header');
  var btnGrantLocation = document.getElementById('btn-grant-location');
  var cartLocationStatus = document.getElementById('cart-location-status');
  var btnWhatsappOrder = document.getElementById('btn-whatsapp-order');

  // Nav menu elements
  var navSidebar = document.getElementById('nav-sidebar');
  var navOverlay = document.getElementById('nav-overlay');
  var menuToggleBtn = document.getElementById('menu-toggle-btn');
  var navCloseBtn = document.getElementById('nav-close-btn');

  // ============================================
  // 4. CART OPEN / CLOSE
  // ============================================

  function openCart() {
    if (!cartSidebar) return;
    cartSidebar.classList.add('open');
    if (cartOverlay) cartOverlay.classList.add('open');
    document.body.classList.add('cart-open');
  }

  function closeCart() {
    if (!cartSidebar) return;
    cartSidebar.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('open');
    document.body.classList.remove('cart-open');
  }

  function toggleCart() {
    if (cartSidebar && cartSidebar.classList.contains('open')) {
      closeCart();
    } else {
      openCart();
    }
  }

  if (cartToggleBtn) cartToggleBtn.addEventListener('click', toggleCart);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // ============================================
  // 5. NAV MENU OPEN / CLOSE
  // ============================================

  function openNav() {
    if (!navSidebar) return;
    navSidebar.classList.add('open');
    if (navOverlay) navOverlay.classList.add('open');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    if (!navSidebar) return;
    navSidebar.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  if (menuToggleBtn) menuToggleBtn.addEventListener('click', openNav);
  if (navCloseBtn) navCloseBtn.addEventListener('click', closeNav);
  if (navOverlay) navOverlay.addEventListener('click', closeNav);

  // Close any open panel on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (cartSidebar && cartSidebar.classList.contains('open')) closeCart();
      if (navSidebar && navSidebar.classList.contains('open')) closeNav();
    }
  });

  // ============================================
  // 6. ADD TO CART
  // ============================================

  function addToCart(id, name, price, image, tags, category) {
    var cart = getCart();
    var existingItem = null;

    cart.forEach(function (entry) {
      if (entry.id === id) {
        existingItem = entry;
      }
    });

    if (existingItem) {
      existingItem.qty += 1;
    } else {
      cart.push({
        id: id,
        name: name,
        price: parseFloat(price),
        image: image,
        tags: tags || '',
        parent: category || '',
        qty: 1
      });
    }

    saveCart(cart);
    updateCartUI();
    openCart(); // Auto-open cart when item is added
  }

  // ============================================
  // 7. REMOVE FROM CART
  // ============================================

  function removeFromCart(id) {
    var cart = getCart();
    var newCart = cart.filter(function (entry) {
      return entry.id !== id;
    });
    saveCart(newCart);
    updateCartUI();
  }

  // ============================================
  // 8. UPDATE QUANTITY
  // ============================================

  function updateQuantity(id, delta) {
    var cart = getCart();
    var item = null;

    cart.forEach(function (entry) {
      if (entry.id === id) {
        item = entry;
      }
    });

    if (!item) return;

    item.qty += delta;

    if (item.qty <= 0) {
      removeFromCart(id);
      return;
    }

    saveCart(cart);
    updateCartUI();
  }

  // ============================================
  // 9. GEOLOCATION — DISTANCE CALCULATION
  // ============================================

  function calculateDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var toRad = function (deg) { return deg * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      if (cartLocationStatus) {
        cartLocationStatus.className = 'cart-location-status error';
        cartLocationStatus.textContent = '⚠️ Browser does not support geolocation.';
      }
      return;
    }

    if (btnGrantLocation) {
      btnGrantLocation.disabled = true;
      btnGrantLocation.textContent = '📡 Fetching location...';
    }

    if (cartLocationStatus) {
      cartLocationStatus.className = 'cart-location-status loading';
      cartLocationStatus.textContent = 'Fetching coordinates...';
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        distanceMeters = calculateDistance(
          SHOP_LOCATION.lat, SHOP_LOCATION.lng,
          userLocation.lat, userLocation.lng
        );

        if (btnGrantLocation) {
          btnGrantLocation.classList.add('granted');
          btnGrantLocation.textContent = '✅ Location Verified — ' + (distanceMeters / 1000).toFixed(2) + ' km';
          btnGrantLocation.disabled = true;
        }

        if (cartLocationStatus) {
          cartLocationStatus.className = 'cart-location-status success';
          cartLocationStatus.textContent = 'Distance: ' + (distanceMeters / 1000).toFixed(2) + ' km from shop';
        }

        updateCartUI();
      },
      function () {
        if (btnGrantLocation) {
          btnGrantLocation.disabled = false;
          btnGrantLocation.textContent = '📍 Share Location for Delivery';
        }

        if (cartLocationStatus) {
          cartLocationStatus.className = 'cart-location-status error';
          cartLocationStatus.textContent = '❌ Location access denied. Please allow location to proceed.';
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  if (btnGrantLocation) {
    btnGrantLocation.addEventListener('click', requestLocation);
  }

  // ============================================
  // 10. BUILD WHATSAPP MESSAGE
  // ============================================

  function buildWhatsAppMsg(cart, subtotal, deliveryCharge, total) {
    // # change whatsapp-message-template here
    var msg = 'Hello ' + SHOP_NAME + '! 🍕\n\nI want to order:\n\n';

    cart.forEach(function (item) {
      var cat = item.parent ? ' (' + item.parent + ')' : '';
      msg += '• ' + item.name + cat + ' × ' + item.qty + ' = ₹' + (item.price * item.qty).toFixed(2) + '\n';
    });

    if (userLocation) {
      msg += '\n📍 Delivery From: ' + SHOP_DELIVERY_ORIGIN;
      msg += '\n📏 Distance: ' + (distanceMeters / 1000).toFixed(2) + ' km';
    }

    msg += '\n\n*Subtotal:* ₹' + subtotal.toFixed(2);
    msg += '\n*Delivery:* ' + (deliveryCharge === 0 ? 'Free' : '₹' + deliveryCharge.toFixed(2));
    msg += '\n*TOTAL: ₹' + total.toFixed(2) + '*';
    msg += '\n\nPlease confirm my order. Thank you! 🙏';

    return msg;
  }

  // ============================================
  // 11. RENDER CART UI (DOM-safe, no innerHTML)
  // ============================================

  function createCartItemElement(item) {
    var lineTotal = (item.price * item.qty).toFixed(2);
    var cartItemEl = document.createElement('div');
    cartItemEl.classList.add('cart-item');
    cartItemEl.setAttribute('data-cart-id', String(item.id));

    // Thumbnail
    var thumbDiv = document.createElement('div');
    thumbDiv.className = 'cart-item-thumb';
    var thumbImg = document.createElement('img');
    thumbImg.src = item.image;
    thumbImg.alt = item.name;
    thumbDiv.appendChild(thumbImg);
    cartItemEl.appendChild(thumbDiv);

    // Info
    var infoDiv = document.createElement('div');
    infoDiv.className = 'cart-item-info';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'cart-item-name';
    nameDiv.textContent = item.name;
    infoDiv.appendChild(nameDiv);

    var tagsDiv = document.createElement('div');
    tagsDiv.className = 'cart-item-tags';
    tagsDiv.textContent = item.tags;
    infoDiv.appendChild(tagsDiv);

    // Qty selector
    var qtyDiv = document.createElement('div');
    qtyDiv.className = 'qty-selector';

    var minusBtn = document.createElement('button');
    minusBtn.className = 'qty-btn qty-minus';
    minusBtn.setAttribute('aria-label', 'Decrease quantity');
    minusBtn.textContent = '−';
    qtyDiv.appendChild(minusBtn);

    var divider1 = document.createElement('span');
    divider1.className = 'qty-divider';
    qtyDiv.appendChild(divider1);

    var qtyVal = document.createElement('span');
    qtyVal.className = 'qty-value';
    qtyVal.textContent = String(item.qty);
    qtyDiv.appendChild(qtyVal);

    var divider2 = document.createElement('span');
    divider2.className = 'qty-divider';
    qtyDiv.appendChild(divider2);

    var plusBtn = document.createElement('button');
    plusBtn.className = 'qty-btn qty-plus';
    plusBtn.setAttribute('aria-label', 'Increase quantity');
    plusBtn.textContent = '+';
    qtyDiv.appendChild(plusBtn);

    infoDiv.appendChild(qtyDiv);
    cartItemEl.appendChild(infoDiv);

    // Price
    var priceDiv = document.createElement('div');
    priceDiv.className = 'cart-item-price';
    priceDiv.textContent = '₹' + lineTotal;
    cartItemEl.appendChild(priceDiv);

    // Remove button
    var removeBtn = document.createElement('button');
    removeBtn.className = 'cart-item-remove';
    removeBtn.setAttribute('aria-label', 'Remove item');
    removeBtn.textContent = '×';
    cartItemEl.appendChild(removeBtn);

    // Bind events using closures with safe item reference
    var safeId = String(item.id);
    minusBtn.addEventListener('click', function () { updateQuantity(safeId, -1); });
    plusBtn.addEventListener('click', function () { updateQuantity(safeId, 1); });
    removeBtn.addEventListener('click', function () { removeFromCart(safeId); });

    return cartItemEl;
  }

  function updateDeliveryNudge(subtotal) {
    if (!deliveryNudgeLabel) return;

    // Clear existing content
    while (deliveryNudgeLabel.firstChild) {
      deliveryNudgeLabel.removeChild(deliveryNudgeLabel.firstChild);
    }

    if (subtotal >= FREE_DELIVERY_THRESHOLD) {
      deliveryNudgeLabel.appendChild(document.createTextNode('🎉 You\'ve unlocked '));
      var strong = document.createElement('strong');
      strong.textContent = 'free delivery!';
      deliveryNudgeLabel.appendChild(strong);
    } else {
      var remaining = (FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2);
      // # change currency-symbol here if not ₹
      deliveryNudgeLabel.appendChild(document.createTextNode('Use '));
      var strong2 = document.createElement('strong');
      strong2.textContent = '₹' + remaining;
      deliveryNudgeLabel.appendChild(strong2);
      deliveryNudgeLabel.appendChild(document.createTextNode(' more and get free delivery'));
    }
  }

  function updateCartUI() {
    var cart = getCart();

    // --- Badge ---
    var totalItems = 0;
    cart.forEach(function (entry) { totalItems += entry.qty; });

    if (cartBadge) {
      cartBadge.textContent = String(totalItems);
      if (totalItems > 0) {
        cartBadge.classList.add('visible');
      } else {
        cartBadge.classList.remove('visible');
      }
    }

    var capsuleCartBadge = document.getElementById('capsule-cart-badge');
    if (capsuleCartBadge) {
      capsuleCartBadge.textContent = String(totalItems);
      if (totalItems > 0) {
        capsuleCartBadge.style.display = 'flex';
      } else {
        capsuleCartBadge.style.display = 'none';
      }
    }

    // --- Subtotal ---
    var subtotal = 0;
    cart.forEach(function (entry) { subtotal += entry.price * entry.qty; });

    // --- Delivery Progress ---
    if (deliveryProgress) {
      var progress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
      deliveryProgress.style.width = progress + '%';
    }

    updateDeliveryNudge(subtotal);

    // --- Cart Items ---
    if (cartItemsContainer) {
      var existingCards = cartItemsContainer.querySelectorAll('.cart-item');
      existingCards.forEach(function (el) { el.remove(); });
    }

    if (cart.length === 0) {
      if (cartEmpty) cartEmpty.style.display = 'flex';
      if (cartFooter) cartFooter.style.display = 'none';
      return;
    }

    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'block';

    // Render each cart item using safe DOM creation
    cart.forEach(function (item) {
      var el = createCartItemElement(item);
      if (cartItemsContainer) cartItemsContainer.appendChild(el);
    });

    // --- Delivery Calculation ---
    var deliveryCharge = 0;
    var deliveryText = 'Share location above';
    var canDeliver = true;

    if (userLocation) {
      if (distanceMeters > MAX_DELIVERY_DISTANCE) {
        canDeliver = false;
        deliveryText = 'Out of delivery area (> ' + (MAX_DELIVERY_DISTANCE / 1000) + 'km)';
      } else if (distanceMeters <= 300) {
        deliveryCharge = 0;
        deliveryText = 'Free (Under 300m)';
      } else if (distanceMeters <= 3000 && subtotal > 149) {
        deliveryCharge = 0;
        deliveryText = 'Free (Order > ₹149)';
      } else {
        deliveryCharge = Math.round(distanceMeters * RATE_PER_METER * 100) / 100;
        deliveryText = '₹' + deliveryCharge.toFixed(2) + ' (' + (distanceMeters / 1000).toFixed(2) + ' km)';
      }
    }

    var total = subtotal + deliveryCharge;

    // --- Totals ---
    // # change currency-symbol here if not ₹
    if (cartSubtotal) cartSubtotal.textContent = '₹' + subtotal.toFixed(2);
    if (cartDelivery) cartDelivery.textContent = deliveryText;
    if (cartTotal) cartTotal.textContent = '₹' + total.toFixed(2);

    // --- WhatsApp Button ---
    if (btnWhatsappOrder) {
      if (userLocation && canDeliver) {
        var waMsg = buildWhatsAppMsg(cart, subtotal, deliveryCharge, total);
        btnWhatsappOrder.href = 'https://wa.me/' + PHONE_NUMBER + '?text=' + encodeURIComponent(waMsg);
        btnWhatsappOrder.classList.remove('disabled');
        btnWhatsappOrder.textContent = '📲 Order via WhatsApp';
      } else if (userLocation && !canDeliver) {
        btnWhatsappOrder.href = '#';
        btnWhatsappOrder.classList.add('disabled');
        btnWhatsappOrder.textContent = '🚫 Cannot Deliver (Too Far)';
      } else {
        btnWhatsappOrder.href = '#';
        btnWhatsappOrder.classList.add('disabled');
        btnWhatsappOrder.textContent = '🔒 Share Location to Order';
      }
    }
  }

  // ============================================
  // 12. "ADD TO CART" BUTTON LISTENERS
  // ============================================
  var addToCartButtons = document.querySelectorAll('.btn-add-cart');

  addToCartButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');
      var price = btn.getAttribute('data-price');
      var image = btn.getAttribute('data-image');
      var tags = btn.getAttribute('data-tags');
      var category = btn.getAttribute('data-category') || '';

      addToCart(id, name, price, image, tags, category);

      // Brief visual feedback
      if (btn.classList.contains('catalog-card-action-btn')) {
        // Circular button: keep icon but morph SVG plus to checkmark and scale up
        var originalBg = btn.style.backgroundColor;
        btn.style.backgroundColor = 'var(--pizza-red)';
        btn.style.transform = 'translateX(-50%) scale(1.25)';

        var svg = btn.querySelector('svg');
        var originalChildren = [];
        if (svg) {
          // Save and remove original children safely
          while (svg.firstChild) {
            originalChildren.push(svg.firstChild);
            svg.removeChild(svg.firstChild);
          }
          // Create checkmark polyline using SVG namespace
          var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          polyline.setAttribute('points', '20 6 9 17 4 12');
          polyline.setAttribute('stroke', 'currentColor');
          polyline.setAttribute('fill', 'none');
          polyline.setAttribute('stroke-width', '3');
          polyline.setAttribute('stroke-linecap', 'round');
          polyline.setAttribute('stroke-linejoin', 'round');
          svg.appendChild(polyline);
        }

        setTimeout(function () {
          btn.style.backgroundColor = '';
          btn.style.transform = '';
          if (svg) {
            // Remove the checkmark polyline
            while (svg.firstChild) {
              svg.removeChild(svg.firstChild);
            }
            // Restore original icon children
            originalChildren.forEach(function (child) {
              svg.appendChild(child);
            });
          }
        }, 1200);
      } else {
        // Traditional button: text feedback
        var originalText = btn.textContent;
        btn.textContent = '✓ Added!';
        btn.style.backgroundColor = 'var(--pizza-red)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--pizza-red)';

        setTimeout(function () {
          btn.textContent = originalText;
          btn.style.backgroundColor = '';
          btn.style.color = '';
          btn.style.borderColor = '';
        }, 1200);
      }
    });
  });
  // ============================================
  // 13. CATEGORY NAVIGATION — ACTIVE STATE
  // ============================================

  var categoryItems = document.querySelectorAll('.category-item');

  categoryItems.forEach(function (item) {
    item.addEventListener('click', function () {
      categoryItems.forEach(function (cat) {
        cat.classList.remove('active');
      });
      item.classList.add('active');
    });
  });

  // ============================================
  // 14. STICKY HEADER — SCROLL SHADOW
  // ============================================

  if (siteHeader) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // ============================================
  // 15. SCROLL-REVEAL ANIMATIONS
  // ============================================

  var revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealElements.length > 0) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ============================================
  // 16. COMBO DEAL BUTTONS (placeholder action)
  // ============================================

  var comboButtons = document.querySelectorAll('.btn-combo');

  comboButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // # change combo-action here
      btn.textContent = '✓ Coming Soon!';
      btn.style.backgroundColor = 'var(--pizza-red)';
      btn.style.borderColor = 'var(--pizza-red)';

      setTimeout(function () {
        btn.textContent = 'Select Combo';
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
      }, 1500);
    });
  });

  // ============================================
  // 17. HERO VIDEO FALLBACK
  // ============================================

  var heroVideo = document.querySelector('.hero-video');

  if (heroVideo) {
    heroVideo.addEventListener('error', function () {
      heroVideo.style.display = 'none';
      heroVideo.parentElement.style.background =
        'linear-gradient(135deg, #2c1810 0%, #1c1c1c 50%, #3d1a0f 100%)';
    });
  }
  // ============================================
  // 19. PREMIUM CATALOG FUNCTIONALITY (FURNITURE STYLE)
  // ============================================

  var catalogSearch = document.getElementById('catalog-search-input');
  var catalogChips = document.querySelectorAll('.catalog-chip');
  var catalogCards = document.querySelectorAll('.catalog-card');
  var bottomCartBtn = document.getElementById('bottom-cart-btn');
  var bottomWishlistBtn = document.getElementById('bottom-wishlist-btn');

  function filterCatalog() {
    var query = catalogSearch ? catalogSearch.value.toLowerCase().trim() : '';
    var activeChip = document.querySelector('.catalog-chip.active');
    var filterValue = activeChip ? activeChip.getAttribute('data-filter') : 'all';

    catalogCards.forEach(function (card) {
      var titleElement = card.querySelector('.catalog-card-title');
      var title = titleElement ? titleElement.textContent.toLowerCase() : '';
      var tags = (card.getAttribute('data-tags') || '').toLowerCase();
      var matchesSearch = title.indexOf(query) !== -1 || tags.indexOf(query) !== -1;
      
      var matchesChip = filterValue === 'all' || tags.indexOf(filterValue) !== -1;

      if (matchesSearch && matchesChip) {
        card.style.display = '';
        card.classList.add('filtering');
        setTimeout(function () {
          card.classList.remove('filtering');
        }, 350);
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (catalogSearch) {
    catalogSearch.addEventListener('input', filterCatalog);
  }

  catalogChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      catalogChips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      filterCatalog();
    });
  });

  if (bottomCartBtn) {
    bottomCartBtn.addEventListener('click', openCart);
  }

  if (bottomWishlistBtn) {
    bottomWishlistBtn.addEventListener('click', function () {
      alert('❤️ Favorites system coming soon! Double tap items to favorite.');
    });
  }

  // ============================================
  // 18. INITIALIZE — Load cart from sessionStorage
  // ============================================
  updateCartUI();

})();
