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
      // Replace this with your actual service role key from Supabase dashboard
      SUPABASE_SERVICE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaXl1a3BqdWd0eHRrbWtldW12Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU5NzcxOCwiZXhwIjoyMDY4MTczNzE4fQ.SERVICE_ROLE_KEY_HERE",
    };
    return envVars[name];
  }

  // Create admin client with service role key for uploads
  getAdminClient() {
    const serviceKey = this.getEnvVariable("SUPABASE_SERVICE_KEY");
    if (!serviceKey) {
      throw new Error("Service role key required for admin operations");
    }

    return {
      baseUrl: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    };
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

  // Upload image to storage bucket using service role
  async uploadImage(file, fileName) {
    try {
      // Use service role key for uploads
      const serviceKey = this.getEnvVariable("SUPABASE_SERVICE_KEY");

      // For now, let's try a simpler approach without service key first
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${this.supabaseUrl}/storage/v1/object/images/posters/${fileName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            apikey: this.supabaseKey,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response:", response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      // Return the public URL
      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/images/posters/${fileName}`;

      return {
        path: `posters/${fileName}`,
        publicUrl: publicUrl,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  // Alternative upload method using base64 encoding
  async uploadImageBase64(file, fileName) {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      // Upload as base64 string
      const response = await fetch(
        `${this.supabaseUrl}/storage/v1/object/images/posters/${fileName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            apikey: this.supabaseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: base64,
            contentType: file.type,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response:", response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      // Return the public URL
      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/images/posters/${fileName}`;

      return {
        path: `posters/${fileName}`,
        publicUrl: publicUrl,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  // Helper function to convert file to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // Remove data:image/...;base64, prefix
      reader.onerror = (error) => reject(error);
    });
  }

  // Delete image from storage
  async deleteImage(filePath) {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/storage/v1/object/images/${filePath}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  }
}

// Global Supabase client instance
const supabase = new SupabaseClient();
