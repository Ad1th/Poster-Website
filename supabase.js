// Supabase configuration and client setup
class SupabaseClient {
  constructor() {
    // Load environment variables
    this.loadEnvVariables();

    this.baseUrl = `${this.supabaseUrl}/rest/v1`;
    this.headers = {
      "Content-Type": "application/json",
      apikey: this.supabaseKey,
      Authorization: `Bearer ${this.supabaseKey}`,
    };
  }

  // Load environment variables from .env file
  loadEnvVariables() {
    // For browser environment, use the fallback values
    // In production, these should be injected by your build process
    this.supabaseUrl = this.getEnvVariable("SUPABASE_URL");
    this.supabaseKey = this.getEnvVariable("SUPABASE_ANON_KEY");

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY"
      );
    }
  }

  // Get env variables (reads from .env values)
  getEnvVariable(name) {
    const envVars = {
      SUPABASE_URL: "https://sdiyukpjugtxtkmkeumv.supabase.co",
      SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaXl1a3BqdWd0eHRrbWtldW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTc3MTgsImV4cCI6MjA2ODE3MzcxOH0.mRyIMWKU4OsS3zlWN6hZE9UNgGOy81517eFmZIXu9-E",
    };
    return envVars[name];
  }

  // Get all posters
  async getPosters() {
    try {
      const response = await fetch(
        `${this.baseUrl}/posters?order=created_at.desc`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching posters:", error);
      throw error;
    }
  }

  // Add new poster
  async addPoster(posterData) {
    try {
      const response = await fetch(`${this.baseUrl}/posters`, {
        method: "POST",
        headers: {
          ...this.headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify(posterData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response has content before parsing JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
      }

      return {};
    } catch (error) {
      console.error("Error adding poster:", error);
      throw error;
    }
  }

  // Update poster
  async updatePoster(id, updateData) {
    try {
      const response = await fetch(`${this.baseUrl}/posters?id=eq.${id}`, {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify({
          ...updateData,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating poster:", error);
      throw error;
    }
  }

  // Delete poster
  async deletePoster(id) {
    try {
      const response = await fetch(`${this.baseUrl}/posters?id=eq.${id}`, {
        method: "DELETE",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting poster:", error);
      throw error;
    }
  }
}

// Global Supabase client instance
const supabase = new SupabaseClient();
