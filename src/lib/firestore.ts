// Firestore 데이터베이스 유틸리티 함수
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  writeBatch,
  runTransaction,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { FIREBASE_COLLECTIONS } from './constants';
import type { 
  UserProfile, 
  Plant, 
  Animal, 
  LearningSession, 
  GameEvent,
  EconomyData,
  Collection as UserCollection,
  Question
} from '@/types';

// 타입 안전성을 위한 컨버터 함수들
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// 사용자 데이터 관리
export class UserService {
  private static collectionRef = collection(db, FIREBASE_COLLECTIONS.USERS);

  static async getUser(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(this.collectionRef, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          joinedAt: timestampToDate(data.joinedAt),
          lastActiveDate: timestampToDate(data.lastActiveDate),
        } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      throw error;
    }
  }

  static async createUser(userId: string, profile: Omit<UserProfile, 'id'>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, userId);
      await setDoc(docRef, {
        ...profile,
        id: userId,
        joinedAt: dateToTimestamp(profile.joinedAt),
        lastActiveDate: dateToTimestamp(profile.lastActiveDate),
      });
    } catch (error) {
      console.error('사용자 생성 실패:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, userId);
      const processedUpdates: any = { ...updates };
      
      // Date 객체를 Timestamp로 변환
      if (updates.lastActiveDate) {
        processedUpdates.lastActiveDate = dateToTimestamp(updates.lastActiveDate);
      }
      
      await updateDoc(docRef, processedUpdates);
    } catch (error) {
      console.error('사용자 정보 업데이트 실패:', error);
      throw error;
    }
  }

  static subscribeToUser(userId: string, callback: (user: UserProfile | null) => void): Unsubscribe {
    const docRef = doc(this.collectionRef, userId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          ...data,
          joinedAt: timestampToDate(data.joinedAt),
          lastActiveDate: timestampToDate(data.lastActiveDate),
        } as UserProfile);
      } else {
        callback(null);
      }
    });
  }
}

// 식물 농장 데이터 관리
export class PlantService {
  static async getUserPlants(userId: string): Promise<Plant[]> {
    try {
      const userDoc = await UserService.getUser(userId);
      if (!userDoc) return [];

      // 사용자 문서의 garden.activePlants 서브컬렉션에서 식물 데이터 가져오기
      const plantsRef = collection(db, FIREBASE_COLLECTIONS.USERS, userId, 'plants');
      const plantsSnapshot = await getDocs(plantsRef);
      
      return plantsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          plantedDate: timestampToDate(data.plantedDate),
          protectionHistory: data.protectionHistory?.map((record: any) => ({
            ...record,
            date: timestampToDate(record.date)
          })) || []
        } as Plant;
      });
    } catch (error) {
      console.error('식물 정보 가져오기 실패:', error);
      throw error;
    }
  }

  static async addPlant(userId: string, plant: Plant): Promise<void> {
    try {
      const plantRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId, 'plants', plant.id);
      await setDoc(plantRef, {
        ...plant,
        plantedDate: dateToTimestamp(plant.plantedDate),
        protectionHistory: plant.protectionHistory.map(record => ({
          ...record,
          date: dateToTimestamp(record.date)
        }))
      });
    } catch (error) {
      console.error('식물 추가 실패:', error);
      throw error;
    }
  }

  static async updatePlant(userId: string, plantId: string, updates: Partial<Plant>): Promise<void> {
    try {
      const plantRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId, 'plants', plantId);
      const processedUpdates: any = { ...updates };
      
      if (updates.protectionHistory) {
        processedUpdates.protectionHistory = updates.protectionHistory.map(record => ({
          ...record,
          date: dateToTimestamp(record.date)
        }));
      }
      
      await updateDoc(plantRef, processedUpdates);
    } catch (error) {
      console.error('식물 업데이트 실패:', error);
      throw error;
    }
  }

  static async deletePlant(userId: string, plantId: string): Promise<void> {
    try {
      const plantRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId, 'plants', plantId);
      await deleteDoc(plantRef);
    } catch (error) {
      console.error('식물 삭제 실패:', error);
      throw error;
    }
  }
}

// 학습 세션 관리
export class SessionService {
  private static collectionRef = collection(db, FIREBASE_COLLECTIONS.SESSIONS);

  static async createSession(session: Omit<LearningSession, 'id'>): Promise<string> {
    try {
      const docRef = doc(this.collectionRef);
      const sessionWithId = {
        ...session,
        id: docRef.id,
        startTime: dateToTimestamp(session.startTime),
        endTime: session.endTime ? dateToTimestamp(session.endTime) : null,
      };
      
      await setDoc(docRef, sessionWithId);
      return docRef.id;
    } catch (error) {
      console.error('학습 세션 생성 실패:', error);
      throw error;
    }
  }

  static async updateSession(sessionId: string, updates: Partial<LearningSession>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, sessionId);
      const processedUpdates: any = { ...updates };
      
      if (updates.startTime) {
        processedUpdates.startTime = dateToTimestamp(updates.startTime);
      }
      if (updates.endTime) {
        processedUpdates.endTime = dateToTimestamp(updates.endTime);
      }
      
      await updateDoc(docRef, processedUpdates);
    } catch (error) {
      console.error('학습 세션 업데이트 실패:', error);
      throw error;
    }
  }

  static async getUserSessions(userId: string, limitCount = 10): Promise<LearningSession[]> {
    try {
      const q = query(
        this.collectionRef,
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startTime: timestampToDate(data.startTime),
          endTime: data.endTime ? timestampToDate(data.endTime) : undefined,
        } as LearningSession;
      });
    } catch (error) {
      console.error('사용자 세션 가져오기 실패:', error);
      throw error;
    }
  }
}

// 문제 데이터 관리
export class QuestionService {
  private static collectionRef = collection(db, FIREBASE_COLLECTIONS.QUESTIONS);

  static async getQuestionsBySubject(subject: string, grade: number, count = 10): Promise<Question[]> {
    try {
      const q = query(
        this.collectionRef,
        where('subject', '==', subject),
        where('gradeRange', 'array-contains', grade),
        limit(count)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Question);
    } catch (error) {
      console.error('문제 가져오기 실패:', error);
      throw error;
    }
  }

  static async addQuestion(question: Question): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, question.id);
      await setDoc(docRef, question);
    } catch (error) {
      console.error('문제 추가 실패:', error);
      throw error;
    }
  }

  static async addQuestions(questions: Question[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      questions.forEach((question) => {
        const docRef = doc(this.collectionRef, question.id);
        batch.set(docRef, question);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('문제 일괄 추가 실패:', error);
      throw error;
    }
  }
}

// 동물 컬렉션 관리
export class AnimalService {
  private static collectionRef = collection(db, FIREBASE_COLLECTIONS.ANIMALS);

  static async getAllAnimals(): Promise<Animal[]> {
    try {
      const querySnapshot = await getDocs(this.collectionRef);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          collectedAt: timestampToDate(data.collectedAt),
        } as Animal;
      });
    } catch (error) {
      console.error('동물 데이터 가져오기 실패:', error);
      throw error;
    }
  }

  static async getAnimalsByRarity(rarity: string): Promise<Animal[]> {
    try {
      const q = query(
        this.collectionRef,
        where('rarity', '==', rarity)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          collectedAt: timestampToDate(data.collectedAt),
        } as Animal;
      });
    } catch (error) {
      console.error('등급별 동물 가져오기 실패:', error);
      throw error;
    }
  }
}

// 게임 이벤트 로깅
export class EventService {
  private static collectionRef = collection(db, FIREBASE_COLLECTIONS.EVENTS);

  static async logEvent(event: Omit<GameEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef);
      await setDoc(docRef, {
        ...event,
        id: docRef.id,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('이벤트 로깅 실패:', error);
      throw error;
    }
  }

  static async getUserEvents(userId: string, limitCount = 50): Promise<GameEvent[]> {
    try {
      const q = query(
        this.collectionRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: timestampToDate(data.timestamp),
        } as GameEvent;
      });
    } catch (error) {
      console.error('사용자 이벤트 가져오기 실패:', error);
      throw error;
    }
  }
}

// 트랜잭션을 사용한 안전한 데이터 업데이트
export class TransactionService {
  static async updateUserEconomy(
    userId: string, 
    economyUpdates: Partial<EconomyData>,
    collectionUpdates?: Partial<UserCollection>
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('사용자를 찾을 수 없습니다.');
        }
        
        const currentData = userDoc.data();
        
        // 경제 데이터 업데이트
        const updatedEconomy = {
          ...currentData.economy,
          ...economyUpdates,
        };
        
        // 컬렉션 데이터 업데이트
        let updatedCollection = currentData.collection;
        if (collectionUpdates) {
          updatedCollection = {
            ...currentData.collection,
            ...collectionUpdates,
          };
        }
        
        transaction.update(userRef, {
          economy: updatedEconomy,
          collection: updatedCollection,
          lastActiveDate: Timestamp.now(),
        });
      });
    } catch (error) {
      console.error('트랜잭션 실패:', error);
      throw error;
    }
  }
}

// 실시간 구독 관리 클래스
export class SubscriptionManager {
  private static subscriptions: Map<string, Unsubscribe> = new Map();

  static subscribe(key: string, unsubscribe: Unsubscribe): void {
    // 기존 구독이 있다면 해제
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)!();
    }
    this.subscriptions.set(key, unsubscribe);
  }

  static unsubscribe(key: string): void {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  static unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }
}