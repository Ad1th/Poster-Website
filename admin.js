// Admin page functionality
class AdminPanel {
  constructor() {
    this.isAuthenticated = false
    this.adminPassword = "hostel123" // Simple password for demo
    this.posters = []
    this.init()
  }

  // Initialize admin panel
  init() {
    this.setupEventListeners()
    this.checkAuthentication()
  }

  // Setup all event listeners
  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("login-form")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e))
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout())
    }

    // Poster form
    const posterForm = document.getElementById("poster-form")
    if (posterForm) {
      posterForm.addEventListener("submit", (e) => this.handleAddPoster(e))
    }
  }

  // Check if user is already authenticated
  checkAuthentication() {
    const isAuth = sessionStorage.getItem("admin_authenticated")
    if (isAuth === "true") {
      this.isAuthenticated = true
      this.showDashboard()
    }
  }

  // Handle login form submission
  handleLogin(e) {
    e.preventDefault()

    const passwordInput = document.getElementById("password")
    const errorEl = document.getElementById("auth-error")
    const password = passwordInput.value

    if (password === this.adminPassword) {
      this.isAuthenticated = true
      sessionStorage.setItem("admin_authenticated", "true")
      errorEl.style.display = "none"
      this.showDashboard()
    } else {
      errorEl.textContent = "Incorrect password"
      errorEl.style.display = "block"
      passwordInput.value = ""
    }
  }

  // Handle logout
  handleLogout() {
    this.isAuthenticated = false
    sessionStorage.removeItem("admin_authenticated")
    this.showLogin()
  }

  // Show login screen
  showLogin() {
    document.getElementById("login-screen").style.display = "flex"
    document.getElementById("admin-dashboard").style.display = "none"
  }

  // Show admin dashboard
  showDashboard() {
    document.getElementById("login-screen").style.display = "none"
    document.getElementById("admin-dashboard").style.display = "block"
    this.loadPosters()
    this.renderPosterList()
  }

  // Load posters from localStorage
  loadPosters() {
    try {
      const stored = localStorage.getItem("hostel_posters")
      if (stored) {
        this.posters = JSON.parse(stored)
      } else {
        this.posters = []
      }
    } catch (error) {
      console.error("Error loading posters:", error)
      this.posters = []
    }
  }

  // Save posters to localStorage
  savePosters() {
    try {
      localStorage.setItem("hostel_posters", JSON.stringify(this.posters))
      // Trigger storage event for main page
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "hostel_posters",
          newValue: JSON.stringify(this.posters),
        }),
      )
    } catch (error) {
      console.error("Error saving posters:", error)
    }
  }

  // Handle add poster form submission
  handleAddPoster(e) {
    e.preventDefault()

    const submitBtn = e.target.querySelector('button[type="submit"]')
    const submitText = document.getElementById("submit-text")
    const messageEl = document.getElementById("form-message")

    // Get form data
    const formData = {
      name: document.getElementById("poster-name").value.trim(),
      image_url: document.getElementById("poster-image").value.trim(),
      quantity: Number.parseInt(document.getElementById("poster-quantity").value) || 0,
      is_available: document.getElementById("poster-available").checked,
    }

    // Validate form data
    if (!formData.name || !formData.image_url) {
      this.showMessage("Please fill in all required fields", "error")
      return
    }

    // Show loading state
    submitBtn.disabled = true
    submitText.textContent = "Adding Poster..."

    // Simulate API delay
    setTimeout(() => {
      try {
        // Create new poster object
        const newPoster = {
          id: Date.now(), // Simple ID generation
          ...formData,
          created_at: new Date().toISOString(),
        }

        // Add to posters array
        this.posters.unshift(newPoster) // Add to beginning
        this.savePosters()

        // Reset form
        e.target.reset()
        document.getElementById("poster-available").checked = true

        // Show success message
        this.showMessage("Poster added successfully!", "success")

        // Re-render poster list
        this.renderPosterList()
      } catch (error) {
        this.showMessage("Error adding poster: " + error.message, "error")
      } finally {
        // Reset button state
        submitBtn.disabled = false
        submitText.textContent = "Add Poster"
      }
    }, 500)
  }

  // Show form message
  showMessage(message, type) {
    const messageEl = document.getElementById("form-message")
    messageEl.textContent = message
    messageEl.className = `form-message message-${type}`
    messageEl.style.display = "block"

    // Hide message after 5 seconds
    setTimeout(() => {
      messageEl.style.display = "none"
    }, 5000)
  }

  // Render poster list for admin
  renderPosterList() {
    const loadingEl = document.getElementById("admin-loading")
    const emptyEl = document.getElementById("admin-empty")
    const listEl = document.getElementById("poster-list")

    // Hide loading
    loadingEl.style.display = "none"

    if (this.posters.length === 0) {
      emptyEl.style.display = "block"
      listEl.style.display = "none"
      return
    }

    // Show list
    emptyEl.style.display = "none"
    listEl.style.display = "flex"

    // Clear existing content
    listEl.innerHTML = ""

    // Render each poster
    this.posters.forEach((poster) => {
      const posterItem = this.createPosterItem(poster)
      listEl.appendChild(posterItem)
    })
  }

  // Create poster item for admin list
  createPosterItem(poster) {
    const item = document.createElement("div")
    item.className = "poster-item"

    const availabilityText = poster.is_available ? "Available" : "Unavailable"
    const toggleClass = poster.is_available ? "btn-toggle-available" : "btn-toggle-unavailable"

    item.innerHTML = `
            <div class="poster-item-info">
                <img 
                    src="${poster.image_url}" 
                    alt="${poster.name}"
                    class="poster-thumbnail"
                    onerror="this.src='https://via.placeholder.com/48x48/475569/94a3b8?text=?'"
                >
                <div class="poster-item-details">
                    <h4>${poster.name}</h4>
                    <p>Qty: ${poster.quantity} • ${availabilityText}</p>
                </div>
            </div>
            <div class="poster-item-actions">
                <button class="btn btn-small ${toggleClass}" onclick="adminPanel.toggleAvailability(${poster.id})">
                    ${availabilityText}
                </button>
                <button class="btn btn-small btn-delete" onclick="adminPanel.deletePoster(${poster.id})">
                    Delete
                </button>
            </div>
        `

    return item
  }

  // Toggle poster availability
  toggleAvailability(posterId) {
    const posterIndex = this.posters.findIndex((p) => p.id === posterId)
    if (posterIndex !== -1) {
      this.posters[posterIndex].is_available = !this.posters[posterIndex].is_available
      this.savePosters()
      this.renderPosterList()
    }
  }

  // Delete poster
  deletePoster(posterId) {
    if (confirm("Are you sure you want to delete this poster?")) {
      this.posters = this.posters.filter((p) => p.id !== posterId)
      this.savePosters()
      this.renderPosterList()
    }
  }
}

// Global admin panel instance
let adminPanel

// Initialize admin panel when page loads
document.addEventListener("DOMContentLoaded", () => {
  adminPanel = new AdminPanel()
})
