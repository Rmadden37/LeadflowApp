// Photo service to fetch and manage user photos from CSV
export interface PhotoData {
  name: string;
  imageUrl: string;
}

class PhotoService {
  private photoCache: Map<string, string> = new Map();
  private isLoading = false;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Parse CSV text into photo data
   */
  private parseCSV(csvText: string): PhotoData[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Skip header row and parse data
    const dataLines = lines.slice(1);
    const photos: PhotoData[] = [];

    for (const line of dataLines) {
      // Simple CSV parsing - handle quoted fields
      const fields = this.parseCSVLine(line);
      if (fields.length >= 2) {
        const name = fields[0]?.trim();
        const imageUrl = fields[1]?.trim();
        
        if (name && imageUrl && this.isValidUrl(imageUrl)) {
          photos.push({ name, imageUrl });
        }
      }
    }

    return photos;
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  /**
   * Validate if a string is a valid URL
   */
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch photos from the CSV and update cache
   */
  private async fetchPhotos(): Promise<void> {
    const csvUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_PHOTOS_CSV_URL;
    if (!csvUrl) {
      console.warn('⚠️ Photo CSV URL not configured');
      return;
    }

    try {
      console.log('🔄 Fetching photos from CSV...');
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      const photos = this.parseCSV(csvText);
      
      // Update cache
      this.photoCache.clear();
      for (const photo of photos) {
        // Normalize name for better matching
        const normalizedName = this.normalizeName(photo.name);
        this.photoCache.set(normalizedName, photo.imageUrl);
      }
      
      this.lastFetchTime = Date.now();
      console.log(`✅ Loaded ${photos.length} photos into cache`);
      
    } catch (error) {
      console.error('❌ Error fetching photos from CSV:', error);
    }
  }

  /**
   * Normalize name for consistent matching
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Find photo URL for a given name
   */
  public async findPhotoUrl(name: string): Promise<string | null> {
    if (!name) return null;

    // Check if we need to refresh the cache
    const now = Date.now();
    const needsRefresh = now - this.lastFetchTime > this.CACHE_DURATION || this.photoCache.size === 0;
    
    if (needsRefresh && !this.isLoading) {
      this.isLoading = true;
      await this.fetchPhotos();
      this.isLoading = false;
    }

    // Try exact match first
    const normalizedName = this.normalizeName(name);
    let photoUrl = this.photoCache.get(normalizedName);
    if (photoUrl) {
      console.log(`✅ Photo found for "${name}": ${photoUrl}`);
      return photoUrl;
    }

    // Try fuzzy matching
    photoUrl = this.fuzzyMatch(name);
    if (photoUrl) {
      console.log(`✅ Fuzzy photo match found for "${name}": ${photoUrl}`);
      return photoUrl;
    }

    console.log(`❌ No photo found for "${name}"`);
    return null;
  }

  /**
   * Fuzzy matching for names
   */
  private fuzzyMatch(searchName: string): string | null {
    const normalizedSearch = this.normalizeName(searchName);
    const searchParts = normalizedSearch.split(' ').filter(part => part.length > 1);
    
    if (searchParts.length < 2) return null;

    const firstName = searchParts[0];
    const lastName = searchParts[searchParts.length - 1];

    // Try to find a match with first and last name
    for (const [cachedName, photoUrl] of this.photoCache.entries()) {
      const cachedParts = cachedName.split(' ').filter(part => part.length > 1);
      
      if (cachedParts.length >= 2) {
        const cachedFirst = cachedParts[0];
        const cachedLast = cachedParts[cachedParts.length - 1];
        
        if (firstName === cachedFirst && lastName === cachedLast) {
          return photoUrl;
        }
      }
    }

    return null;
  }

  /**
   * Get all cached photos (for debugging)
   */
  public getCachedPhotos(): Map<string, string> {
    return new Map(this.photoCache);
  }

  /**
   * Clear the cache (useful for testing)
   */
  public clearCache(): void {
    this.photoCache.clear();
    this.lastFetchTime = 0;
  }
}

// Export singleton instance
export const photoService = new PhotoService();
