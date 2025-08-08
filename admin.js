// Admin page functionality (vanilla JS)
class ImageLightbox {
  constructor(rootSelector = "#image-lightbox") {
    this.root = document.querySelector(rootSelector);
    this.img = this.root.querySelector("#lightbox-img");
    this.caption = this.root.querySelector("#lightbox-caption");
    this.bindEvents();
  }
  bindEvents() {
    this.root.addEventListener("click", (e) => {
      const t = e.target;
      if (
        t.hasAttribute("data-lightbox-close") ||
        t.classList.contains("lightbox-backdrop")
      ) {
        this.close();
      }
    });
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
    const btn = this.root.querySelector(".lightbox-close");
    if (btn) btn.focus();
  }
  close() {
    this.root.classList.remove("open");
    this.root.setAttribute("aria-hidden", "true");
    this.img.src = "";
    this.caption.textContent = "";
  }
  isOpen() {
    return this.root.classList.contains("open");
  }
}

class AdminPanel {
  constructor() {
    this.isAuthenticated = false;
    this.adminPassword = "hostel123"; // Demo only
    this.posters = [];
    this.lightbox = new ImageLightbox();
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

    if (uploadOption && urlOption && fileInput && urlInput) {
      // Set URL option as default
      urlOption.checked = true;
      uploadOption.checked = false;
      fileInput.disabled = true;
      urlInput.disabled = false;

      uploadOption.addEventListener("change", () => {
        fileInput.disabled = false;
        urlInput.disabled = true;
        urlInput.value = "";
        this.clearPreview();
      });

      urlOption.addEventListener("change", () => {
        fileInput.disabled = true;
        urlInput.disabled = false;
        fileInput.value = "";
        this.clearPreview();
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

    // Lightbox for admin list thumbnails
    const list = document.getElementById("poster-list");
    if (list) {
      list.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains("poster-thumbnail")) {
          this.lightbox.open(t.src, t.alt || "");
        }
      });
    }
  }

  // Clear image preview
  clearPreview() {
    const preview = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-img");
    if (preview && previewImg) {
      previewImg.src = "";
      preview.style.display = "none";
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
  async showDashboard() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "block";
    await this.loadPosters();
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

  // Handle file preview
  handleFilePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-img");

    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = "none";
    }
  }

  // Handle URL preview
  handleUrlPreview(e) {
    const url = e.target.value.trim();
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

  // Validate image URL by attempting to load it
  validateImageUrl(url) {
    if (!url || url.trim() === "") return Promise.resolve(false);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // Handle add poster form submission
  async handleAddPoster(e) {
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

      if (uploadOption) {
        const file = fileInput.files[0];

        if (file.size > 5 * 1024 * 1024) {
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
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}_${cleanName}`;
        const targetPath = `posters/${fileName}`;

        try {
          // Primary upload (multipart)
          const uploadResult = await supabase.uploadImage(file, targetPath);
          imageUrl = uploadResult.publicUrl;
          imagePath = uploadResult.path;
        } catch (primaryError) {
          console.warn("Primary upload failed, trying base64:", primaryError);
          submitText.textContent = "Retrying upload...";
          // Fallback upload (base64)
          const uploadResult = await supabase.uploadImageBase64(
            file,
            targetPath
          );
          imageUrl = uploadResult.publicUrl;
          imagePath = uploadResult.path;
        }
      } else {
        // URL option
        imageUrl = urlInput.value.trim();
        const isValid = await this.validateImageUrl(imageUrl);
        if (!isValid) {
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
      if (imagePath) formData.image_path = imagePath;

      // Add poster to Supabase
      await supabase.addPoster(formData);

      // Reset form
      e.target.reset();
      document.getElementById("poster-available").checked = true;
      document.getElementById("url-option").checked = true;
      document.getElementById("upload-option").checked = false;
      document.getElementById("poster-image-file").disabled = true;
      document.getElementById("poster-image-url").disabled = false;
      this.clearPreview();

      // Success
      this.showMessage("Poster added successfully!", "success");

      // Reload and re-render poster list
      await this.loadPosters();
      this.renderPosterList();
    } catch (error) {
      console.error("Add poster error:", error);
      const msg = error && error.message ? error.message : "Unknown error";
      this.showMessage("Error adding poster: " + msg, "error");
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Add Poster";
    }
  }

  // Show form message
  showMessage(message, type) {
    const messageEl = document.getElementById("form-message");
    messageEl.textContent = message;
    messageEl.className = `form-message message-${type}`;
    messageEl.style.display = "block";

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

    if (!this.posters || this.posters.length === 0) {
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
    const price =
      poster.price != null ? `₹${Number(poster.price).toFixed(2)}` : "No price";

    // Use uploaded image or fallback
    let imageUrl = "";
    if (poster.image_path && poster.image_path.trim() !== "") {
      const sub = poster.image_path.replace(/^posters\//, "");
      imageUrl = `${
        supabase.supabaseUrl
      }/storage/v1/object/public/posters/${encodeURIComponent(sub)}`;
    } else if (poster.image_url) {
      imageUrl = poster.image_url;
    } else {
      imageUrl = "https://via.placeholder.com/48x48/475569/94a3b8?text=?";
    }

    item.innerHTML = `
      <div class="poster-item-info">
        <img
          src="${imageUrl}"
          alt="${poster.name}"
          class="poster-thumbnail"
        >
        <div class="poster-item-details">
          <h4>${poster.name}</h4>
          <p>Qty: ${poster.quantity} • ${availabilityText} • ${price}</p>
          ${
            poster.image_path
              ? '<small style="color: #9ca3af;">Uploaded Image</small>'
              : poster.image_url
              ? '<small style="color: #9ca3af;">External URL</small>'
              : '<small style="color: #9ca3af;">No Image</small>'
          }
        </div>
      </div>
      <div class="poster-item-actions">
        <button class="btn btn-small ${toggleClass}" data-action="toggle" data-id="${
      poster.id
    }">
          ${availabilityText}
        </button>
        <button class="btn btn-small btn-delete" data-action="delete" data-id="${
          poster.id
        }">
          Delete
        </button>
      </div>
    `;

    // Attach handlers
    const actions = item.querySelector(".poster-item-actions");
    actions.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      if (action === "toggle") {
        this.toggleAvailability(id);
      } else if (action === "delete") {
        this.deletePoster(id);
      }
    });

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
    const poster = this.posters.find((p) => p.id === posterId);
    if (
      !confirm(
        `Are you sure you want to delete "${poster?.name || "this poster"}"?`
      )
    )
      return;

    try {
      // Delete from database
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

// Global admin panel instance
let adminPanel;

// Initialize admin panel when page loads
document.addEventListener("DOMContentLoaded", () => {
  adminPanel = new AdminPanel();
});
