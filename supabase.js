// Supabase configuration and client setup (vanilla JS)
// IMPORTANT: For a pure browser app, Supabase policies must allow anon writes if you want to insert/update/delete.
// Ensure your RLS policies and Storage policies permit anon role operations used here.
// Recommended Storage bucket: "posters" (public read), with anon insert/update/delete if needed.

class SupabaseClient {
  constructor() {
    this.supabaseUrl = this.getEnvVariable("SUPABASE_URL");
    this.supabaseKey = this.getEnvVariable("SUPABASE_ANON_KEY");

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY");
    }

    this.baseUrl = `${this.supabaseUrl}/rest/v1`;
    this.headers = {
      "Content-Type": "application/json",
      apikey: this.supabaseKey,
      Authorization: `Bearer ${this.supabaseKey}`,
    };

    // Storage bucket name (consistent across app)
    this.storageBucket = "posters";
  }

  // Provide your Supabase URL and anon key here
  getEnvVariable(name) {
    const env = {
      SUPABASE_URL: "https://sdiyukpjugtxtkmkeumv.supabase.co",
      SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaXl1a3BqdWd0eHRrbWtldW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTc3MTgsImV4cCI6MjA2ODE3MzcxOH0.mRyIMWKU4OsS3zlWN6hZE9UNgGOy81517eFmZIXu9-E",
    };
    return env[name];
  }

  // Posters: GET all
  async getPosters() {
    try {
      // Include select=* for Supabase REST
      const response = await fetch(`${this.baseUrl}/posters?select=*&order=created_at.desc`, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching posters:", error);
      throw error;
    }
  }

  // Posters: INSERT
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
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

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

  // Posters: UPDATE by id
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
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating poster:", error);
      throw error;
    }
  }

  // Posters: DELETE by id
  async deletePoster(id) {
    try {
      const response = await fetch(`${this.baseUrl}/posters?id=eq.${id}`, {
        method: "DELETE",
        headers: this.headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting poster:", error);
      throw error;
    }
  }

  // Storage: upload via multipart/form-data
  async uploadImage(file, path) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // path may include "posters/filename" or just "filename"
      const sub = String(path).replace(/^posters\//, "");
      const response = await fetch(`${this.supabaseUrl}/storage/v1/object/${this.storageBucket}/${encodeURIComponent(sub)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          apikey: this.supabaseKey,
          // do not set Content-Type when sending FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload response:", response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.storageBucket}/${encodeURIComponent(sub)}`;

      return {
        path: `posters/${sub}`,
        publicUrl: publicUrl,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  // Alternative: upload as base64 JSON (for edge cases)
  async uploadImageBase64(file, path) {
    try {
      const base64 = await this.fileToBase64(file);
      const sub = String(path).replace(/^posters\//, "");
      const response = await fetch(`${this.supabaseUrl}/storage/v1/object/${this.storageBucket}/${encodeURIComponent(sub)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          apikey: this.supabaseKey,
          "Content-Type": "application/octet-stream",
        },
        body: this.base64ToBlob(base64, file.type),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.storageBucket}/${encodeURIComponent(sub)}`;
      return {
        path: `posters/${sub}`,
        publicUrl,
      };
    } catch (error) {
      console.error("Error uploading image (base64):", error);
      throw error;
    }
  }

  // Delete storage object
  async deleteImage(filePath) {
    try {
      const sub = String(filePath).replace(/^posters\//, "");
      const response = await fetch(`${this.supabaseUrl}/storage/v1/object/${this.storageBucket}/${encodeURIComponent(sub)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          apikey: this.supabaseKey,
        },
      });

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

  // Helpers
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // strip data: prefix
      reader.onerror = (error) => reject(error);
    });
  }

  base64ToBlob(base64, contentType = "application/octet-stream") {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    const sliceSize = 1024;
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }
}

// Global Supabase client instance
const supabase = new SupabaseClient();
