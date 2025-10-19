import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ResourcesService, Resource } from '../../shared/services/resources.service';

@Component({
  selector: 'app-resources',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Learning Resources</h1>
        <p class="text-gray-600">Curated learning materials to accelerate your growth</p>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input 
              type="text" 
              placeholder="Search resources..."
              [(ngModel)]="searchTerm"
              (input)="filterResources()"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          
          <!-- Category Filter -->
          <select 
            [(ngModel)]="selectedCategory"
            (change)="filterResources()"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Categories</option>
            <option value="article">Articles</option>
            <option value="book">Books</option>
            <option value="video">Videos</option>
            <option value="course">Courses</option>
            <option value="tool">Tools</option>
            <option value="template">Templates</option>
          </select>

          <!-- Difficulty Filter -->
          <select 
            [(ngModel)]="selectedDifficulty"
            (change)="filterResources()"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <!-- Quick Categories -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button 
            *ngFor="let category of categories"
            (click)="filterByCategory(category.key)"
            class="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 hover:border-blue-300 transition-colors">
            <div [innerHTML]="category.icon" class="text-2xl mb-2 text-blue-600"></div>
            <div class="font-medium text-sm text-gray-900">{{ category.name }}</div>
            <div class="text-xs text-gray-500">{{ getCategoryCount(category.key) }} items</div>
          </button>
        </div>
      </div>

      <!-- Resources Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          *ngFor="let resource of filteredResources()"
          class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          
          <!-- Resource Header -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center space-x-2">
                <span class="px-2 py-1 text-xs font-medium rounded-full"
                      [class]="getCategoryStyle(resource.category)">
                  {{ getCategoryName(resource.category) }}
                </span>
                <span class="px-2 py-1 text-xs font-medium rounded-full"
                      [class]="getDifficultyStyle(resource.difficulty)">
                  {{ resource.difficulty | titlecase }}
                </span>
              </div>
              <button 
                (click)="toggleBookmark(resource)"
                class="text-gray-400 hover:text-yellow-500 transition-colors">
                <svg class="w-5 h-5" [class.text-yellow-500]="resource.isBookmarked" 
                     [class.fill-current]="resource.isBookmarked"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
              </button>
            </div>

            <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {{ resource.title }}
            </h3>
            
            <p class="text-gray-600 text-sm mb-4 line-clamp-3">
              {{ resource.description }}
            </p>

            <!-- Meta Info -->
            <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div class="flex items-center space-x-4">
                <span *ngIf="resource.author" class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  {{ resource.author }}
                </span>
                <span *ngIf="resource.duration" class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {{ resource.duration }}
                </span>
              </div>
            </div>

            <!-- Rating -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="flex items-center space-x-1">
                  <span *ngFor="let star of getStars(resource.rating)" 
                        class="text-yellow-400">★</span>
                  <span *ngFor="let star of getEmptyStars(resource.rating)" 
                        class="text-gray-300">★</span>
                </div>
                <span class="ml-2 text-sm text-gray-600">({{ resource.rating }}/5)</span>
              </div>
              
              <a 
                [href]="resource.url" 
                target="_blank" 
                rel="noopener noreferrer"
                (click)="onResourceAccess(resource)"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Access Resource
              </a>
            </div>

            <!-- Tags -->
            <div class="mt-4 flex flex-wrap gap-2">
              <span *ngFor="let tag of resource.tags.slice(0, 3)" 
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {{ tag }}
              </span>
              <span *ngIf="resource.tags.length > 3" 
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                +{{ resource.tags.length - 3 }} more
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="filteredResources().length === 0" 
           class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.096-5.583-2.709M3 12a9 9 0 0118 0 9 9 0 01-18 0z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
        <p class="text-gray-500">Try adjusting your search criteria or browse different categories.</p>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class ResourcesComponent implements OnInit {
  private authService = inject(AuthService);
  private resourcesService = inject(ResourcesService);
  
  searchTerm = '';
  selectedCategory = '';
  selectedDifficulty = '';
  
  resources = signal<Resource[]>([]);
  filteredResources = signal<Resource[]>([]);

  categories = this.resourcesService.getCategories();

  ngOnInit(): void {
    this.loadResources();
  }

  private loadResources(): void {
    this.resourcesService.getResources().subscribe(resources => {
      this.resources.set(resources);
      this.filteredResources.set(resources);
    });
  }

  filterResources(): void {
    const allResources = this.resources();
    let filtered = [...allResources];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(term) ||
        resource.description.toLowerCase().includes(term) ||
        resource.tags.some(tag => tag.toLowerCase().includes(term)) ||
        resource.author?.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter(resource => resource.category === this.selectedCategory);
    }

    // Filter by difficulty
    if (this.selectedDifficulty) {
      filtered = filtered.filter(resource => resource.difficulty === this.selectedDifficulty);
    }

    this.filteredResources.set(filtered);
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.filterResources();
  }

  getCategoryCount(category: string): number {
    return this.resources().filter(resource => resource.category === category).length;
  }

  getCategoryStyle(category: string): string {
    const styles = {
      article: 'bg-blue-100 text-blue-800',
      book: 'bg-green-100 text-green-800',
      video: 'bg-purple-100 text-purple-800',
      course: 'bg-orange-100 text-orange-800',
      tool: 'bg-gray-100 text-gray-800',
      template: 'bg-pink-100 text-pink-800'
    };
    return styles[category as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  }

  getDifficultyStyle(difficulty: string): string {
    const styles = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return styles[difficulty as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  }

  getCategoryName(category: string): string {
    const names = {
      article: 'Article',
      book: 'Book',
      video: 'Video',
      course: 'Course',
      tool: 'Tool',
      template: 'Template'
    };
    return names[category as keyof typeof names] || category;
  }

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - Math.floor(rating)).fill(0);
  }

  toggleBookmark(resource: Resource): void {
    this.resourcesService.toggleBookmark(resource.id).subscribe(() => {
      this.loadResources(); // Reload to get updated data
    });
  }

  onResourceAccess(resource: Resource): void {
    this.resourcesService.incrementViewCount(resource.id).subscribe();
  }
}