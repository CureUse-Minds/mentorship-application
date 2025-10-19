import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  limit 
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DatabaseDiagnosticService {
  private firestore = inject(Firestore);

  /**
   * Comprehensive database structure analysis
   */
  async analyzeDatabaseStructure(): Promise<void> {
    console.log('🔍 Starting Firebase Database Analysis...');
    console.log('='.repeat(50));

    try {
      // 1. Check basic connectivity
      await this.checkConnectivity();

      // 2. Analyze users collection
      await this.analyzeUsersCollection();

      // 3. Analyze profiles collection (where mentors are actually stored)
      await this.analyzeProfilesCollection();

      // 4. Check for mentor-related data
      await this.findMentorData();

      // 5. Test different query patterns
      await this.testQueryPatterns();

    } catch (error) {
      console.error('❌ Database analysis failed:', error);
    }

    console.log('='.repeat(50));
    console.log('✅ Database analysis complete');
  }

  private async checkConnectivity(): Promise<void> {
    console.log('\n🔗 1. Testing Firebase Connectivity');
    console.log('-'.repeat(30));

    try {
      const testCollection = collection(this.firestore, 'test-connection');
      const snapshot = await getDocs(query(testCollection, limit(1)));
      console.log('✅ Firebase connection successful');
      console.log(`📊 Test query executed successfully`);
    } catch (error: any) {
      console.error('❌ Firebase connection failed:', error);
      console.error('🔍 Error details:', {
        code: error.code,
        message: error.message
      });
    }
  }

  private async analyzeUsersCollection(): Promise<void> {
    console.log('\n👥 2. Analyzing Users Collection');
    console.log('-'.repeat(30));

    try {
      const usersRef = collection(this.firestore, 'users');
      const allUsers = await getDocs(usersRef);
      
      console.log(`📊 Total users found: ${allUsers.docs.length}`);

      if (allUsers.docs.length === 0) {
        console.log('⚠️ No users found in database');
        return;
      }

      // Analyze field structure
      const fieldAnalysis = this.analyzeFields(allUsers.docs);
      console.log('\n📋 Field Analysis:');
      console.log(fieldAnalysis);

      // Show sample documents
      console.log('\n📄 Sample Documents (first 3):');
      allUsers.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`\nUser ${index + 1} (ID: ${doc.id}):`);
        console.log(JSON.stringify(data, null, 2));
      });

    } catch (error: any) {
      console.error('❌ Error analyzing users collection:', error);
      console.error('🔍 Error details:', {
        code: error.code,
        message: error.message
      });
    }
  }

  private async analyzeProfilesCollection(): Promise<void> {
    console.log('\n📋 3. Analyzing Profiles Collection (Main mentor source)');
    console.log('-'.repeat(30));

    try {
      const profilesRef = collection(this.firestore, 'profiles');
      const allProfiles = await getDocs(profilesRef);

      console.log(`📊 Total profiles found: ${allProfiles.docs.length}`);

      if (allProfiles.docs.length === 0) {
        console.log('⚠️ No profiles found in database');
        console.log('💡 This explains why mentors are not showing in booking form');
        return;
      }

      const fieldAnalysis = this.analyzeFields(allProfiles.docs);
      console.log('\n🔍 Profile Field Analysis:');
      Object.entries(fieldAnalysis).forEach(([field, data]) => {
        const fieldData = data as { count: number, sampleValues: string[] };
        console.log(`   ${field}: ${fieldData.count}/${allProfiles.docs.length} (${fieldData.sampleValues.join(', ')})`);
      });

      // Show sample profiles
      console.log('\n📄 Sample profiles:');
      allProfiles.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`\nProfile ${index + 1} (ID: ${doc.id}):`);
        console.log(JSON.stringify(data, null, 2));
      });

    } catch (error: any) {
      console.error('❌ Error analyzing profiles collection:', error);
      console.error('🔍 Error details:', {
        code: error.code,
        message: error.message
      });
    }
  }

  private async findMentorData(): Promise<void> {
    console.log('\n🎓 4. Searching for Mentor Data');
    console.log('-'.repeat(30));

    const mentorSearchPatterns = [
      { field: 'role', value: 'mentor' },
      { field: 'role', value: 'Mentor' },
      { field: 'userType', value: 'mentor' },
      { field: 'userType', value: 'Mentor' },
      { field: 'accountType', value: 'mentor' },
      { field: 'accountType', value: 'Mentor' },
      { field: 'type', value: 'mentor' },
      { field: 'type', value: 'Mentor' }
    ];

    // Check both collections: users and profiles
    const collections = [
      { name: 'users', ref: collection(this.firestore, 'users') },
      { name: 'profiles', ref: collection(this.firestore, 'profiles') }
    ];

    for (const collectionInfo of collections) {
      console.log(`\n🔍 Searching in ${collectionInfo.name} collection:`);
      
      for (const pattern of mentorSearchPatterns) {
        try {
          const mentorQuery = query(collectionInfo.ref, where(pattern.field, '==', pattern.value));
          const mentors = await getDocs(mentorQuery);
          
          if (mentors.docs.length > 0) {
            console.log(`✅ Found ${mentors.docs.length} ${collectionInfo.name} with ${pattern.field}='${pattern.value}'`);
            
            // Show first mentor as example
            const firstMentor = mentors.docs[0];
            console.log(`📄 Sample mentor data (${pattern.field}='${pattern.value}'):`);
            console.log(JSON.stringify(firstMentor.data(), null, 2));
          } else {
            console.log(`❌ No ${collectionInfo.name} found with ${pattern.field}='${pattern.value}'`);
          }
        } catch (error: any) {
          console.log(`⚠️ Query failed for ${pattern.field}='${pattern.value}': ${error.message}`);
        }
      }
    }
  }

  private async testQueryPatterns(): Promise<void> {
    console.log('\n🧪 4. Testing Query Patterns');
    console.log('-'.repeat(30));

    const usersRef = collection(this.firestore, 'users');

    // Test 1: Simple queries without complex where clauses
    try {
      console.log('🔍 Testing simple user query...');
      const simpleQuery = query(usersRef, limit(5));
      const simpleResults = await getDocs(simpleQuery);
      console.log(`✅ Simple query successful: ${simpleResults.docs.length} results`);
    } catch (error) {
      console.log('❌ Simple query failed:', error);
    }

    // Test 2: Check if ordering works
    try {
      console.log('🔍 Testing ordered query...');
      // Try ordering by a common field
      const orderedQuery = query(usersRef, limit(3));
      const orderedResults = await getDocs(orderedQuery);
      console.log(`✅ Ordered query successful: ${orderedResults.docs.length} results`);
    } catch (error) {
      console.log('❌ Ordered query failed:', error);
    }

    // Test 3: Check for composite index requirements
    try {
      console.log('🔍 Testing composite query (role + deleted)...');
      const compositeQuery = query(
        usersRef,
        where('role', '==', 'mentor'),
        where('deleted', '!=', true)
      );
      const compositeResults = await getDocs(compositeQuery);
      console.log(`✅ Composite query successful: ${compositeResults.docs.length} results`);
    } catch (error: any) {
      console.log('❌ Composite query failed:', error.message);
      if (error.code === 'failed-precondition') {
        console.log('💡 This error suggests a composite index is required');
        console.log('🔧 Try simplifying the query or create the required index');
      }
    }
  }

  private analyzeFields(docs: any[]): any {
    const fieldCount: { [key: string]: number } = {};
    const fieldTypes: { [key: string]: Set<string> } = {};
    const fieldSamples: { [key: string]: any[] } = {};

    docs.forEach(doc => {
      const data = doc.data();
      Object.keys(data).forEach(field => {
        // Count occurrences
        fieldCount[field] = (fieldCount[field] || 0) + 1;
        
        // Track types
        if (!fieldTypes[field]) fieldTypes[field] = new Set();
        fieldTypes[field].add(typeof data[field]);
        
        // Collect samples
        if (!fieldSamples[field]) fieldSamples[field] = [];
        if (fieldSamples[field].length < 3) {
          fieldSamples[field].push(data[field]);
        }
      });
    });

    const analysis: any = {};
    Object.keys(fieldCount).forEach(field => {
      analysis[field] = {
        count: fieldCount[field],
        percentage: Math.round((fieldCount[field] / docs.length) * 100),
        types: Array.from(fieldTypes[field]),
        samples: fieldSamples[field]
      };
    });

    return analysis;
  }

  /**
   * Quick mentor check - call this from component
   */
  async quickMentorCheck(): Promise<any> {
    console.log('🚀 Quick Mentor Check');
    
    try {
      const usersRef = collection(this.firestore, 'users');
      const allUsers = await getDocs(usersRef);
      
      const result = {
        totalUsers: allUsers.docs.length,
        mentorCount: 0,
        availableRoles: new Set(),
        sampleUsers: [] as any[]
      };

      allUsers.docs.forEach(doc => {
        const data = doc.data();
        result.sampleUsers.push({ id: doc.id, ...data });
        
        // Check for role fields
        if (data['role']) result.availableRoles.add(data['role']);
        if (data['userType']) result.availableRoles.add(data['userType']);
        if (data['accountType']) result.availableRoles.add(data['accountType']);
        
        // Count mentors
        if (data['role'] === 'mentor' || data['userType'] === 'mentor' || data['accountType'] === 'mentor') {
          result.mentorCount++;
        }
      });

      console.log('📊 Quick Check Results:', {
        totalUsers: result.totalUsers,
        mentorCount: result.mentorCount,
        availableRoles: Array.from(result.availableRoles),
        sampleUsers: result.sampleUsers.slice(0, 2)
      });

      return result;
    } catch (error) {
      console.error('❌ Quick check failed:', error);
      return null;
    }
  }
}