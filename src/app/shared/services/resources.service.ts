import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: 'article' | 'book' | 'video' | 'course' | 'tool' | 'template';
  url: string;
  author?: string;
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  rating: number;
  isBookmarked: boolean;
  dateAdded?: Date;
  viewCount?: number;
}

export interface ResourceCategory {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResourcesService {
  private resources = signal<Resource[]>([]);
  private bookmarkedResources = signal<Resource[]>([]);

  constructor() {
    this.loadInitialResources();
  }

  private loadInitialResources(): void {
    const initialResources: Resource[] = [
      {
        id: '1',
        title: 'The Mentor\'s Guide: Facilitating Effective Learning Relationships',
        description: 'A comprehensive guide on how to be an effective mentor, covering best practices, common challenges, and proven frameworks for building successful mentoring relationships.',
        category: 'book',
        url: 'https://www.amazon.com/Mentors-Guide-Facilitating-Effective-Relationships/dp/0470907731',
        author: 'Lois J. Zachary',
        difficulty: 'intermediate',
        tags: ['mentoring', 'leadership', 'relationships', 'guide'],
        rating: 4.5,
        isBookmarked: false,
        dateAdded: new Date('2024-01-15'),
        viewCount: 245
      },
      {
        id: '2',
        title: 'How to Give and Receive Feedback Effectively',
        description: 'Learn the art of constructive feedback that promotes growth and maintains positive relationships. Essential reading for mentors and mentees.',
        category: 'article',
        url: 'https://hbr.org/2019/03/the-feedback-fallacy',
        author: 'Harvard Business Review',
        duration: '15 min read',
        difficulty: 'beginner',
        tags: ['feedback', 'communication', 'growth', 'performance'],
        rating: 4.2,
        isBookmarked: false,
        dateAdded: new Date('2024-02-01'),
        viewCount: 187
      },
      {
        id: '3',
        title: 'SMART Goals Framework Workshop',
        description: 'Interactive course on setting and achieving SMART goals, with practical exercises and real-world examples for personal and professional development.',
        category: 'course',
        url: 'https://www.coursera.org/learn/smart-goals',
        author: 'University of Virginia',
        duration: '4 weeks',
        difficulty: 'beginner',
        tags: ['goals', 'productivity', 'planning', 'SMART', 'achievement'],
        rating: 4.7,
        isBookmarked: false,
        dateAdded: new Date('2024-01-20'),
        viewCount: 312
      },
      {
        id: '4',
        title: 'Building Resilience in Challenging Times',
        description: 'TED talk on developing mental resilience and coping strategies for overcoming obstacles and thriving in uncertainty.',
        category: 'video',
        url: 'https://www.ted.com/talks/amy_edmondson_how_to_turn_a_group_of_strangers_into_a_team',
        author: 'Amy Edmondson',
        duration: '18 minutes',
        difficulty: 'beginner',
        tags: ['resilience', 'mental-health', 'psychology', 'motivation'],
        rating: 4.8,
        isBookmarked: false,
        dateAdded: new Date('2024-02-10'),
        viewCount: 423
      },
      {
        id: '5',
        title: 'Career Development Planning Template',
        description: 'Comprehensive template for creating personalized career development plans with milestone tracking and progress evaluation.',
        category: 'template',
        url: '#career-template',
        difficulty: 'beginner',
        tags: ['career', 'planning', 'template', 'development', 'goals'],
        rating: 4.3,
        isBookmarked: false,
        dateAdded: new Date('2024-01-25'),
        viewCount: 156
      },
      {
        id: '6',
        title: 'Notion: All-in-One Workspace',
        description: 'Powerful productivity tool for note-taking, task management, and collaboration. Perfect for organizing mentorship activities.',
        category: 'tool',
        url: 'https://notion.so',
        difficulty: 'beginner',
        tags: ['productivity', 'organization', 'collaboration', 'notes'],
        rating: 4.6,
        isBookmarked: false,
        dateAdded: new Date('2024-02-05'),
        viewCount: 289
      },
      {
        id: '7',
        title: 'Deep Work: Rules for Focused Success',
        description: 'Learn how to focus without distraction on cognitively demanding tasks in our increasingly connected world. Essential for career advancement.',
        category: 'book',
        url: 'https://www.amazon.com/Deep-Work-Focused-Success-Distracted/dp/1455586692',
        author: 'Cal Newport',
        difficulty: 'intermediate',
        tags: ['productivity', 'focus', 'career', 'success', 'concentration'],
        rating: 4.9,
        isBookmarked: false,
        dateAdded: new Date('2024-01-10'),
        viewCount: 378
      },
      {
        id: '8',
        title: 'Effective Communication in Remote Teams',
        description: 'Best practices for maintaining clear communication and building strong relationships in distributed teams and virtual mentoring.',
        category: 'article',
        url: 'https://blog.zoom.us/remote-team-communication-best-practices/',
        author: 'Zoom Communications',
        duration: '12 min read',
        difficulty: 'intermediate',
        tags: ['communication', 'remote-work', 'teams', 'virtual'],
        rating: 4.1,
        isBookmarked: false,
        dateAdded: new Date('2024-02-15'),
        viewCount: 203
      },
      {
        id: '9',
        title: 'Leadership Skills Masterclass',
        description: 'Comprehensive course on developing essential leadership skills including emotional intelligence, decision-making, and team management.',
        category: 'course',
        url: 'https://www.udemy.com/course/leadership-skills/',
        author: 'Chris Croft',
        duration: '8 hours',
        difficulty: 'intermediate',
        tags: ['leadership', 'management', 'skills', 'emotional-intelligence'],
        rating: 4.4,
        isBookmarked: false,
        dateAdded: new Date('2024-01-30'),
        viewCount: 167
      },
      {
        id: '10',
        title: 'The Science of Well-Being',
        description: 'Yale\'s most popular course on happiness and well-being, based on cutting-edge psychological science and practical applications.',
        category: 'course',
        url: 'https://www.coursera.org/learn/the-science-of-well-being',
        author: 'Laurie Santos - Yale University',
        duration: '20 hours',
        difficulty: 'beginner',
        tags: ['well-being', 'psychology', 'happiness', 'mental-health', 'yale'],
        rating: 4.8,
        isBookmarked: false,
        dateAdded: new Date('2024-02-20'),
        viewCount: 512
      },
      {
        id: '11',
        title: 'Time Management Matrix Template',
        description: 'Eisenhower Matrix template for prioritizing tasks based on urgency and importance. Includes examples and implementation guide.',
        category: 'template',
        url: '#time-management-template',
        difficulty: 'beginner',
        tags: ['time-management', 'productivity', 'prioritization', 'eisenhower'],
        rating: 4.2,
        isBookmarked: false,
        dateAdded: new Date('2024-02-08'),
        viewCount: 134
      },
      {
        id: '12',
        title: 'Mindfulness and Meditation for Beginners',
        description: 'Introduction to mindfulness practices and meditation techniques to reduce stress and improve focus and well-being.',
        category: 'video',
        url: 'https://www.headspace.com/meditation/mindfulness',
        author: 'Headspace',
        duration: '45 minutes',
        difficulty: 'beginner',
        tags: ['mindfulness', 'meditation', 'stress-relief', 'mental-health'],
        rating: 4.6,
        isBookmarked: false,
        dateAdded: new Date('2024-02-12'),
        viewCount: 198
      }
    ];

    this.resources.set(initialResources);
  }

  getResources(): Observable<Resource[]> {
    return of(this.resources());
  }

  getResourcesByCategory(category: string): Observable<Resource[]> {
    const filtered = this.resources().filter(resource => resource.category === category);
    return of(filtered);
  }

  getResourcesByDifficulty(difficulty: string): Observable<Resource[]> {
    const filtered = this.resources().filter(resource => resource.difficulty === difficulty);
    return of(filtered);
  }

  searchResources(query: string): Observable<Resource[]> {
    const term = query.toLowerCase().trim();
    if (!term) return of(this.resources());

    const filtered = this.resources().filter(resource =>
      resource.title.toLowerCase().includes(term) ||
      resource.description.toLowerCase().includes(term) ||
      resource.tags.some(tag => tag.toLowerCase().includes(term)) ||
      resource.author?.toLowerCase().includes(term)
    );

    return of(filtered);
  }

  toggleBookmark(resourceId: string): Observable<Resource> {
    const resources = this.resources();
    const index = resources.findIndex(r => r.id === resourceId);
    
    if (index !== -1) {
      resources[index].isBookmarked = !resources[index].isBookmarked;
      this.resources.set([...resources]);
      
      // Update bookmarked resources list
      const bookmarked = resources.filter(r => r.isBookmarked);
      this.bookmarkedResources.set(bookmarked);
      
      return of(resources[index]);
    }
    
    throw new Error('Resource not found');
  }

  getBookmarkedResources(): Observable<Resource[]> {
    const bookmarked = this.resources().filter(r => r.isBookmarked);
    return of(bookmarked);
  }

  incrementViewCount(resourceId: string): Observable<Resource> {
    const resources = this.resources();
    const index = resources.findIndex(r => r.id === resourceId);
    
    if (index !== -1) {
      resources[index].viewCount = (resources[index].viewCount || 0) + 1;
      this.resources.set([...resources]);
      return of(resources[index]);
    }
    
    throw new Error('Resource not found');
  }

  getCategories(): ResourceCategory[] {
    return [
      {
        key: 'article',
        name: 'Articles',
        description: 'In-depth articles and blog posts',
        icon: '📄',
        color: 'blue'
      },
      {
        key: 'book',
        name: 'Books',
        description: 'Recommended reading materials',
        icon: '📚',
        color: 'green'
      },
      {
        key: 'video',
        name: 'Videos',
        description: 'Educational videos and talks',
        icon: '🎥',
        color: 'purple'
      },
      {
        key: 'course',
        name: 'Courses',
        description: 'Structured learning courses',
        icon: '🎓',
        color: 'orange'
      },
      {
        key: 'tool',
        name: 'Tools',
        description: 'Productivity and learning tools',
        icon: '🛠️',
        color: 'gray'
      },
      {
        key: 'template',
        name: 'Templates',
        description: 'Ready-to-use templates',
        icon: '📋',
        color: 'pink'
      }
    ];
  }

  getResourceStats() {
    const resources = this.resources();
    const categories = this.getCategories();
    
    return {
      total: resources.length,
      byCategory: categories.map(cat => ({
        category: cat.key,
        count: resources.filter(r => r.category === cat.key).length
      })),
      byDifficulty: {
        beginner: resources.filter(r => r.difficulty === 'beginner').length,
        intermediate: resources.filter(r => r.difficulty === 'intermediate').length,
        advanced: resources.filter(r => r.difficulty === 'advanced').length
      },
      bookmarked: resources.filter(r => r.isBookmarked).length,
      averageRating: resources.reduce((sum, r) => sum + r.rating, 0) / resources.length
    };
  }
}