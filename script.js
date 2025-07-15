// Main store page functionality
class PosterStore {
  constructor() {
    this.posters = [];
    this.init();
  }

  // Initialize the store
  async init() {
    await this.loadPosters();
    this.renderPosters();
  }

  // Load posters from Supabase
  async loadPosters() {
    try {
      this.posters = await supabase.getPosters();
    } catch (error) {
      console.error("Error loading posters:", error);
      this.posters = [];
      // Show error message to user
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

    // Hide loading
    if (loadingEl) loadingEl.style.display = "none";

    // Check if we have posters
    if (this.posters.length === 0) {
      if (emptyStateEl) emptyStateEl.style.display = "block";
      if (gridEl) gridEl.style.display = "none";
      return;
    }

    // Show grid and hide empty state
    if (emptyStateEl) emptyStateEl.style.display = "none";
    if (gridEl) {
      gridEl.style.display = "grid";
      gridEl.innerHTML = "";

      // Render each poster
      this.posters.forEach((poster) => {
        const posterCard = this.createPosterCard(poster);
        gridEl.appendChild(posterCard);
      });
    }
  }

  // Create a poster card element
  createPosterCard(poster) {
    const card = document.createElement("div");
    card.className = "poster-card";

    const isInStock = poster.is_available && poster.quantity > 0;
    const badgeClass = isInStock ? "badge-in-stock" : "badge-out-of-stock";
    const badgeText = isInStock ? "In Stock" : "Out of Stock";
    const statusClass = isInStock ? "status-available" : "status-unavailable";
    const statusText = isInStock ? "Available" : "Unavailable";

    // Format price
    const price = poster.price ? `₹${poster.price}` : "Price TBD";

    // Create multiple fallback images
    const fallbackImages = [
      "https://via.placeholder.com/300x400/334155/94a3b8?text=No+Image",
      "https://placehold.co/300x400/334155/94a3b8/png?text=Poster",
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMzMzQxNTUiLz48dGV4dCB4PSIxNTAiIHk9IjIwMCIgZmlsbD0iIzk0YTNiOCIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==",
    ];

    card.innerHTML = `
            <div class="poster-image-container">
                <div class="image-loading">Loading...</div>
                <img 
                    src="${poster.image_url || fallbackImages[0]}" 
                    alt="${poster.name}"
                    class="poster-image"
                    onload="this.previousElementSibling.style.display='none'; this.style.display='block';"
                    onerror="this.handleImageError(this, ${JSON.stringify(
                      fallbackImages
                    ).replace(/"/g, "&quot;")})"
                    style="display: none;"
                >
                <div class="availability-badge ${badgeClass}">
                    ${badgeText}
                </div>
            </div>
            <div class="poster-details">
                <h3 class="poster-name">${poster.name}</h3>
                <div class="poster-price">${price}</div>
                <div class="poster-footer">
                    <span class="poster-quantity">Qty: ${poster.quantity}</span>
                    <button class="btn poster-status-btn ${statusClass}" ${
      !isInStock ? "disabled" : ""
    }>
                        ${statusText}
                    </button>
                </div>
            </div>
        `;

    // Add image error handling after creating the card
    const img = card.querySelector(".poster-image");
    this.setupImageErrorHandling(img, fallbackImages);

    return card;
  }

  // Setup robust image error handling
  setupImageErrorHandling(img, fallbackImages) {
    let fallbackIndex = 0;

    const handleError = () => {
      const loadingDiv = img.previousElementSibling;

      // Try next fallback image
      if (fallbackIndex < fallbackImages.length - 1) {
        fallbackIndex++;
        img.src = fallbackImages[fallbackIndex];
      } else {
        // All fallbacks failed, show final fallback
        loadingDiv.style.display = "none";
        img.style.display = "block";
        img.style.backgroundColor = "#334155";
        img.style.color = "#94a3b8";
        img.style.display = "flex";
        img.style.alignItems = "center";
        img.style.justifyContent = "center";
        img.innerHTML =
          '<span style="font-size: 14px;">Image Unavailable</span>';
      }
    };

    img.onerror = handleError;

    // Also validate the initial URL
    this.validateImageUrl(img.src).then((isValid) => {
      if (!isValid && img.src !== fallbackImages[0]) {
        handleError();
      }
    });
  }

  // Validate image URL
  async validateImageUrl(url) {
    if (!url || url.trim() === "") return false;

    try {
      const response = await fetch(url, { method: "HEAD" });
      return (
        response.ok &&
        response.headers.get("content-type")?.startsWith("image/")
      );
    } catch {
      return false;
    }
  }
}

// Initialize the store when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new PosterStore();
});
