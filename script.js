// Main store page functionality
class PosterStore {
  constructor() {
    this.posters = [];
    this.init();
  }

  // Initialize the store
  init() {
    this.loadPosters();
    this.renderPosters();
  }

  // Load posters from localStorage
  loadPosters() {
    try {
      const stored = localStorage.getItem("hostel_posters");
      if (stored) {
        this.posters = JSON.parse(stored);
      } else {
        // Initialize with sample data if no data exists
        this.initializeSampleData();
      }
    } catch (error) {
      console.error("Error loading posters:", error);
      this.initializeSampleData();
    }
  }

  // Initialize with sample poster data
  initializeSampleData() {
    this.posters = [
      {
        id: 1,
        name: "Minimalist Mountain",
        image_url:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
        quantity: 5,
        is_available: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Abstract Waves",
        image_url:
          "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=600&fit=crop",
        quantity: 3,
        is_available: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: "City Skyline",
        image_url:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=600&fit=crop",
        quantity: 0,
        is_available: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 4,
        name: "Geometric Patterns",
        image_url:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
        quantity: 8,
        is_available: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 5,
        name: "Nature Landscape",
        image_url:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
        quantity: 2,
        is_available: true,
        created_at: new Date().toISOString(),
      },
    ];

    // Save sample data to localStorage
    this.savePosters();
  }

  // Save posters to localStorage
  savePosters() {
    try {
      localStorage.setItem("hostel_posters", JSON.stringify(this.posters));
    } catch (error) {
      console.error("Error saving posters:", error);
    }
  }

  // Render all posters
  renderPosters() {
    const loadingEl = document.getElementById("loading");
    const emptyStateEl = document.getElementById("empty-state");
    const gridEl = document.getElementById("poster-grid");

    // Hide loading
    loadingEl.style.display = "none";

    // Check if we have posters
    if (this.posters.length === 0) {
      emptyStateEl.style.display = "block";
      gridEl.style.display = "none";
      return;
    }

    // Show grid and hide empty state
    emptyStateEl.style.display = "none";
    gridEl.style.display = "grid";

    // Clear existing content
    gridEl.innerHTML = "";

    // Render each poster
    this.posters.forEach((poster) => {
      const posterCard = this.createPosterCard(poster);
      gridEl.appendChild(posterCard);
    });
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

// Listen for storage changes (when admin adds/removes posters)
window.addEventListener("storage", (e) => {
  if (e.key === "hostel_posters") {
    // Reload and re-render posters
    const store = new PosterStore();
  }
});
