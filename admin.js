// Admin page functionality
class AdminPanel {
  constructor() {
    this.isAuthenticated = false;
    this.adminPassword = "hostel123"; // Simple password for demo
    this.posters = [];
    this.init();
  }

  // Initialize admin panel
  init() {
    this.setupEventListeners();
    this.checkAuthentication();
  }

  // Setup all event listeners
  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Poster form
    const posterForm = document.getElementById("poster-form");
    if (posterForm) {
      posterForm.addEventListener("submit", (e) => this.handleAddPoster(e));
    }

    // Image option radio buttons
    const uploadOption = document.getElementById("upload-option");
    const urlOption = document.getElementById("url-option");
    const fileInput = document.getElementById("poster-image-file");
    const urlInput = document.getElementById("poster-image-url");

    if (uploadOption && urlOption) {
      uploadOption.addEventListener("change", () => {
        fileInput.disabled = false;
        urlInput.disabled = true;
        urlInput.value = "";
      });

      urlOption.addEventListener("change", () => {
        fileInput.disabled = true;
        urlInput.disabled = false;
        fileInput.value = "";
      });
    }

    // File input preview
    if (fileInput) {
      fileInput.addEventListener("change", (e) => this.handleFilePreview(e));
    }

    // URL input preview
    if (urlInput) {
      urlInput.addEventListener("input", (e) => this.handleUrlPreview(e));
    }
  }

  // Check if user is already authenticated
  checkAuthentication() {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      this.isAuthenticated = true;
      this.showDashboard();
    }
  }

  // Handle login form submission
  handleLogin(e) {
    e.preventDefault();

    const passwordInput = document.getElementById("password");
    const errorEl = document.getElementById("auth-error");
    const password = passwordInput.value;

    if (password === this.adminPassword) {
      this.isAuthenticated = true;
      sessionStorage.setItem("admin_authenticated", "true");
      errorEl.style.display = "none";
      this.showDashboard();
    } else {
      errorEl.textContent = "Incorrect password";
      errorEl.style.display = "block";
      passwordInput.value = "";
    }
  }

  // Handle logout
  handleLogout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem("admin_authenticated");
    this.showLogin();
  }

  // Show login screen
  showLogin() {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("admin-dashboard").style.display = "none";
  }

  // Show admin dashboard
  showDashboard() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "block";
    this.loadPosters();
    this.renderPosterList();
  }

  // Load posters from Supabase
  async loadPosters() {
    try {
      this.posters = await supabase.getPosters();
    } catch (error) {
      console.error("Error loading posters:", error);
      this.posters = [];
      this.showMessage("Failed to load posters from database", "error");
    }
  }

  // Save posters to localStorage
  savePosters() {
    try {
      this.loadPosters();
      localStorage.setItem("hostel_posters", JSON.stringify(this.posters));
      // Trigger storage event for main page
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "hostel_posters",
          newValue: JSON.stringify(this.posters),
        })
      );
    } catch (error) {
      console.error("Error saving posters:", error);
    }
  }

  // Handle file preview
  handleFilePreview(e) {
    this.loadPosters();
    const file = e.target.files[0];
    const preview = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-img");

    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = "none";
    }
  }

  // Handle URL preview
  handleUrlPreview(e) {
    this.loadPosters();
    const url = e.target.value;
    const preview = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-img");

    if (url) {
      previewImg.src = url;
      previewImg.onload = () => (preview.style.display = "block");
      previewImg.onerror = () => (preview.style.display = "none");
    } else {
      preview.style.display = "none";
    }
  }

  // Handle add poster form submission
  async handleAddPoster(e) {
    this.loadPosters();
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById("submit-text");

    // Get form data
    const formData = {
      name: document.getElementById("poster-name").value.trim(),
      quantity:
        Number.parseInt(document.getElementById("poster-quantity").value) || 0,
      is_available: document.getElementById("poster-available").checked,
      price:
        Number.parseFloat(document.getElementById("poster-price").value) || 0.0,
    };

    // Get image data
    const uploadOption = document.getElementById("upload-option").checked;
    const fileInput = document.getElementById("poster-image-file");
    const urlInput = document.getElementById("poster-image-url");

    // Validate form data
    if (!formData.name) {
      this.showMessage("Please enter a poster name", "error");
      return;
    }

    if (uploadOption && !fileInput.files[0]) {
      this.showMessage("Please select an image file", "error");
      return;
    }

    if (!uploadOption && !urlInput.value.trim()) {
      this.showMessage("Please enter an image URL", "error");
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitText.textContent = uploadOption
      ? "Uploading image..."
      : "Validating image...";

    try {
      let imageUrl = null;
      let imagePath = null;
      this.loadPosters();

      if (uploadOption) {
        // Handle file upload
        const file = fileInput.files[0];

        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          this.showMessage("File size must be less than 5MB", "error");
          return;
        }

        if (!file.type.startsWith("image/")) {
          this.showMessage("Please select a valid image file", "error");
          return;
        }

        submitText.textContent = "Uploading to storage...";

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split(".").pop();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}_${cleanName}`;

        try {
          // Try primary upload method
          const uploadResult = await supabase.uploadImage(file, fileName);
          imageUrl = uploadResult.publicUrl;
          imagePath = uploadResult.path;
        } catch (primaryError) {
          console.log(
            "Primary upload failed, trying alternative method:",
            primaryError
          );
          submitText.textContent = "Retrying upload...";

          // Try alternative upload method
          const uploadResult = await supabase.uploadImageAlternative(
            file,
            fileName
          );
          imageUrl = uploadResult.publicUrl;
          imagePath = uploadResult.path;
        }
      } else {
        // Handle URL option
        imageUrl = urlInput.value.trim();

        // Validate URL
        const isValidImage = await this.validateImageUrl(imageUrl);
        if (!isValidImage) {
          this.showMessage(
            "Invalid image URL. Please check the URL and try again.",
            "error"
          );
          return;
        }
      }

      submitText.textContent = "Adding poster...";

      // Add image data to form
      formData.image_url = imageUrl;
      if (imagePath) {
        formData.image_path = imagePath;
      }

      // Add poster to Supabase
      await supabase.addPoster(formData);

      // Reset form
      e.target.reset();
      document.getElementById("poster-available").checked = true;
      document.getElementById("upload-option").checked = true;
      document.getElementById("poster-image-file").disabled = false;
      document.getElementById("poster-image-url").disabled = true;
      document.getElementById("image-preview").style.display = "none";

      // Show success message
      this.showMessage("Poster added successfully!", "success");

      // Reload and re-render poster list
      await this.loadPosters();
      this.renderPosterList();
    } catch (error) {
      console.error("Upload error details:", error);
      this.showMessage("Error adding poster: " + error.message, "error");
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitText.textContent = "Add Poster";
    }
  }

  // Validate image URL
  async validateImageUrl(url) {
    if (!url || url.trim() === "") return false;

    try {
      const response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors", // Handle CORS issues
      });
      return true; // If no error, assume it's valid
    } catch {
      // Try to load as img element
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    }
  }

  // Show form message
  showMessage(message, type) {
    const messageEl = document.getElementById("form-message");
    messageEl.textContent = message;
    messageEl.className = `form-message message-${type}`;
    messageEl.style.display = "block";

    // Hide message after 5 seconds
    setTimeout(() => {
      messageEl.style.display = "none";
    }, 5000);
  }

  // Render poster list for admin
  renderPosterList() {
    const loadingEl = document.getElementById("admin-loading");
    const emptyEl = document.getElementById("admin-empty");
    const listEl = document.getElementById("poster-list");

    // Hide loading
    loadingEl.style.display = "none";

    if (this.posters.length === 0) {
      emptyEl.style.display = "block";
      listEl.style.display = "none";
      return;
    }

    // Show list
    emptyEl.style.display = "none";
    listEl.style.display = "flex";

    // Clear existing content
    listEl.innerHTML = "";

    // Render each poster
    this.posters.forEach((poster) => {
      const posterItem = this.createPosterItem(poster);
      listEl.appendChild(posterItem);
    });
  }

  // Create poster item for admin list
  createPosterItem(poster) {
    const item = document.createElement("div");
    item.className = "poster-item";

    const availabilityText = poster.is_available ? "Available" : "Unavailable";
    const toggleClass = poster.is_available
      ? "btn-toggle-available"
      : "btn-toggle-unavailable";
    const price = poster.price ? `₹${poster.price}` : "No price";

    // Use uploaded image or fallback
    const imageUrl =
      poster.image_url ||
      "https://via.placeholder.com/48x48/475569/94a3b8?text=?";

    item.innerHTML = `
            <div class="poster-item-info">
                <img 
                    src="${imageUrl}" 
                    alt="${poster.name}"
                    class="poster-thumbnail"
                    onerror="this.src='https://via.placeholder.com/48x48/475569/94a3b8?text=?'; this.onerror=null;"
                    onload="this.style.opacity='1';"
                    style="opacity: 0; transition: opacity 0.3s;"
                >
                <div class="poster-item-details">
                    <h4>${poster.name}</h4>
                    <p>Qty: ${
                      poster.quantity
                    } • ${availabilityText} • ${price}</p>
                    ${
                      poster.image_path
                        ? '<small style="color: #6b7280;">Uploaded Image</small>'
                        : '<small style="color: #6b7280;">External URL</small>'
                    }
                </div>
            </div>
            <div class="poster-item-actions">
                <button class="btn btn-small ${toggleClass}" onclick="adminPanel.toggleAvailability(${
      poster.id
    })">
                    ${availabilityText}
                </button>
                <button class="btn btn-small btn-delete" onclick="adminPanel.deletePoster(${
                  poster.id
                })">
                    Delete
                </button>
            </div>
        `;

    return item;
  }

  // Toggle poster availability
  async toggleAvailability(posterId) {
    try {
      const poster = this.posters.find((p) => p.id === posterId);
      if (poster) {
        await supabase.updatePoster(posterId, {
          is_available: !poster.is_available,
        });

        await this.loadPosters();
        this.renderPosterList();
        this.showMessage("Poster availability updated", "success");
      }
    } catch (error) {
      this.showMessage("Error updating poster: " + error.message, "error");
    }
  }

  // Delete poster (with image cleanup)
  async deletePoster(posterId) {
    if (confirm("Are you sure you want to delete this poster?")) {
      try {
        const poster = this.posters.find((p) => p.id === posterId);

        // Delete from database first
        await supabase.deletePoster(posterId);

        // If poster had an uploaded image, delete it from storage
        if (poster && poster.image_path) {
          try {
            await supabase.deleteImage(poster.image_path);
          } catch (error) {
            console.warn("Could not delete image from storage:", error);
          }
        }

        await this.loadPosters();
        this.renderPosterList();
        this.showMessage("Poster deleted successfully", "success");
      } catch (error) {
        this.showMessage("Error deleting poster: " + error.message, "error");
      }
    }
  }
}

// Global admin panel instance
let adminPanel;

// Initialize admin panel when page loads
document.addEventListener("DOMContentLoaded", () => {
  adminPanel = new AdminPanel();
});
