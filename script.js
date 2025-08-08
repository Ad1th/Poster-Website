// Main store page functionality (vanilla JS)
class ImageLightbox {
  constructor(rootSelector = "#image-lightbox") {
    this.root = document.querySelector(rootSelector);
    this.img = this.root.querySelector("#lightbox-img");
    this.caption = this.root.querySelector("#lightbox-caption");
    this.bindEvents();
  }
  bindEvents() {
    // Close on backdrop or button click
    this.root.addEventListener("click", (e) => {
      const t = e.target;
      if (
        t.hasAttribute("data-lightbox-close") ||
        t.classList.contains("lightbox-backdrop")
      ) {
        this.close();
      }
    });
    // ESC to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) this.close();
    });
  }
  open(src, alt = "") {
    if (!src) return;
    this.img.src = src;
    this.img.alt = alt || "Poster";
    this.caption.textContent = alt || "";
    this.root.setAttribute("aria-hidden", "false");
    this.root.classList.add("open");
    // Focus close button for accessibility
    const btn = this.root.querySelector(".lightbox-close");
    if (btn) btn.focus();
  }
  close() {
    this.root.classList.remove("open");
    this.root.setAttribute("aria-hidden", "true");
    this.img.src = "";
    this.img.alt = "";
    this.caption.textContent = "";
  }
  isOpen() {
    return this.root.classList.contains("open");
  }
}

class PosterStore {
  constructor() {
    this.posters = [];
    this.lightbox = new ImageLightbox();
    this.init();
  }

  // Initialize the store
  async init() {
    await this.loadPosters();
    this.renderPosters();
    this.bindGlobalImageClicks();
  }

  // Load posters from Supabase
  async loadPosters() {
    try {
      this.posters = await supabase.getPosters();
    } catch (error) {
      console.error("Error loading posters:", error);
      this.posters = [];
      this.showErrorMessage("Failed to load posters. Please try again later.");
    }
  }

  // Show error message
  showErrorMessage(message) {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.innerHTML = `<div class="loading-text" style="color: #ef4444;">${message}</div>`;
    }
  }

  // Render all posters
  renderPosters() {
    const loadingEl = document.getElementById("loading");
    const emptyStateEl = document.getElementById("empty-state");
    const gridEl = document.getElementById("poster-grid");

    if (loadingEl) loadingEl.style.display = "none";

    const visible = this.posters.filter(
      (p) => p.is_available && (p.quantity ?? 0) > 0
    );

    if (visible.length === 0) {
      if (emptyStateEl) emptyStateEl.style.display = "block";
      if (gridEl) gridEl.style.display = "none";
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = "none";
    if (gridEl) {
      gridEl.style.display = "grid";
      gridEl.innerHTML = "";
      visible.forEach((poster) => {
        const posterCard = this.createPosterCard(poster);
        gridEl.appendChild(posterCard);
      });
    }
  }

  // Create a poster card element
  createPosterCard(poster) {
    const card = document.createElement("div");
    card.className = "poster-card";

    const isInStock = poster.is_available && (poster.quantity ?? 0) > 0;
    const badgeClass = isInStock ? "badge-in-stock" : "badge-out-of-stock";
    const badgeText = isInStock ? "" : "Out of Stock";
    const statusClass = isInStock ? "status-available" : "status-unavailable";

    // Format price
    const price =
      poster.price != null
        ? `₹${Number(poster.price).toFixed(2)}`
        : "Price TBD";

    // Build image URL from Supabase storage or use direct image_url
    const imageUrl = this.getImageUrl(poster);

    card.innerHTML = `
      <div class="poster-image-container">
        <div class="image-loading">Loading...</div>
        <img
          src="${imageUrl}"
          alt="${poster.name}"
          class="poster-image"
          style="display: none;"
        >
        // <div class="availability-badge ${badgeClass}">${badgeText}</div>
      </div>
      <div class="poster-details">
        <h3 class="poster-name">${poster.name}</h3>
        <div class="poster-price">${price}</div>
        <div class="poster-footer">
          <span class="poster-quantity">Qty: ${poster.quantity ?? 0}</span>
          <button class="btn poster-status-btn ${statusClass}" ${
      !isInStock ? "disabled" : ""
    }>
            ${isInStock ? "Available" : "Unavailable"}
          </button>
        </div>
      </div>
    `;

    // Setup image load/error handlers
    const img = card.querySelector(".poster-image");
    const loadingDiv = card.querySelector(".image-loading");
    this.setupImageHandlers(img, loadingDiv, poster);

    return card;
  }

  // Build image URL from storage or fallback
  getImageUrl(poster) {
    if (poster.image_path && poster.image_path.trim() !== "") {
      // poster.image_path may include "posters/filename"
      const sub = poster.image_path.replace(/^posters\//, "");
      return `${
        supabase.supabaseUrl
      }/storage/v1/object/public/posters/${encodeURIComponent(sub)}`;
    }
    if (poster.image_url && poster.image_url.trim() !== "") {
      return poster.image_url.trim();
    }
    return this.getFallbackImage();
  }

  // Fallback image (inline SVG)
  getFallbackImage() {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="400" fill="#334155"/>
        <rect x="50" y="100" width="200" height="200" fill="#475569" rx="8"/>
        <circle cx="100" cy="150" r="15" fill="#64748b"/>
        <polygon points="80,220 120,180 140,200 180,160 220,200 220,220" fill="#64748b"/>
        <text x="150" y="320" fill="#94a3b8" font-size="16" text-anchor="middle" font-family="Arial">No Image Available</text>
      </svg>
    `)}`;
  }

  setupImageHandlers(img, loadingDiv, poster) {
    let triedAlt = false;

    img.addEventListener("load", () => {
      loadingDiv.style.display = "none";
      img.style.display = "block";
    });

    img.addEventListener("error", () => {
      if (!triedAlt && poster.image_url && poster.image_path) {
        // Try the other source once
        triedAlt = true;
        const currentSrc = img.getAttribute("src") || "";
        const storageSrc = this.getImageUrl({
          ...poster,
          image_url: "",
          image_path: poster.image_path,
        });
        const directSrc = poster.image_url;
        img.src = currentSrc === storageSrc ? directSrc : storageSrc;
        return;
      }
      loadingDiv.style.display = "none";
      img.src = this.getFallbackImage();
      img.style.display = "block";
    });
  }

  bindGlobalImageClicks() {
    document.body.addEventListener("click", (e) => {
      const target = e.target;
      if (
        target &&
        target.classList &&
        target.classList.contains("poster-image")
      ) {
        this.lightbox.open(target.src, target.alt || "");
      }
    });
  }
}

// Initialize the store when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new PosterStore();
});
