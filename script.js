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

    card.innerHTML = `
            <div class="poster-image-container">
                <img 
                    src="${poster.image_url}" 
                    alt="${poster.name}"
                    class="poster-image"
                    onerror="this.src='https://via.placeholder.com/300x400/334155/94a3b8?text=No+Image'"
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

    return card;
  }
}

// Initialize the store when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new PosterStore();
});
