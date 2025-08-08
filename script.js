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

    // Get dynamic image URL from Supabase
    const imageUrl = this.getImageUrl(poster);

    card.innerHTML = `
            <div class="poster-image-container">
                <div class="image-loading" style="display: flex; align-items: center; justify-content: center; height: 400px; background: #f3f4f6; color: #6b7280;">
                    Loading...
                </div>
                <img 
                    src="${imageUrl}" 
                    alt="${poster.name}"
                    class="poster-image"
                    style="display: none;"
                    onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                    onerror="this.handleImageError()"
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

    // Setup image error handling after creating the card
    const img = card.querySelector(".poster-image");
    const loadingDiv = card.querySelector(".image-loading");
    this.setupImageErrorHandling(img, loadingDiv, poster);

    return card;
  }

  // Get image URL from Supabase storage or fallback
  getImageUrl(poster) {
    // If poster has image_path, construct Supabase storage URL
    if (poster.image_path) {
      return `https://cspjbqypspcpojibljrl.supabase.co/storage/v1/object/public/poster-images/${poster.image_path}`;
    }
    
    // If poster has direct image_url, use it
    if (poster.image_url && poster.image_url.trim() !== "") {
      return poster.image_url;
    }

    // Return fallback placeholder
    return this.getFallbackImage();
  }

  // Get fallback image
  getFallbackImage() {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="400" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="400" fill="#334155"/>
        <rect x="50" y="100" width="200" height="200" fill="#475569" rx="8"/>
        <circle cx="100" cy="150" r="15" fill="#64748b"/>
        <polygon points="80,220 120,180 140,200 180,160 220,200 220,220" fill="#64748b"/>
        <text x="150" y="320" fill="#94a3b8" font-size="16" text-anchor="middle" font-family="Arial">No Image Available</text>
      </svg>
    `)}`;
  }

  // Setup robust image error handling
  setupImageErrorHandling(img, loadingDiv, poster) {
    let retryCount = 0;
    const maxRetries = 2;

    const handleError = async () => {
      console.log(`Image load failed for poster: ${poster.name}, retry: ${retryCount}`);
      
      if (retryCount < maxRetries) {
        retryCount++;
        
        // Try different image sources based on retry count
        if (retryCount === 1 && poster.image_url) {
          // First retry: try direct URL if available
          img.src = poster.image_url;
        } else if (retryCount === 2) {
          // Second retry: try via signed URL
          const signedUrl = await this.getSignedImageUrl(poster);
          if (signedUrl) {
            img.src = signedUrl;
          } else {
            showFallback();
          }
        }
      } else {
        showFallback();
      }
    };

    const showFallback = () => {
      loadingDiv.style.display = "none";
      img.src = this.getFallbackImage();
      img.style.display = "block";
      img.onerror = null; // Remove error handler to prevent infinite loop
    };

    img.onerror = handleError;

    // Handle very slow loading images
    setTimeout(() => {
      if (img.style.display === "none" && loadingDiv.style.display !== "none") {
        console.log(`Image loading timeout for poster: ${poster.name}`);
        handleError();
      }
    }, 10000); // 10 second timeout
  }

  // Get signed URL for private images
  async getSignedImageUrl(poster) {
    if (!poster.image_path) return null;

    try {
      // This would require calling your backend endpoint
      const response = await fetch(`/api/poster-image/${poster.id}`, {
        credentials: 'include' // Include cookies for authentication
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.signedUrl;
      }
    } catch (error) {
      console.error("Error getting signed URL:", error);
    }
    
    return null;
  }
}

// Initialize the store when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new PosterStore();
});
