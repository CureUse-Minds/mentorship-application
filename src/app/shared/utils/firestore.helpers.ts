/**
 * Firestore Helper Functions
 * Utilities for working with Firestore data
 */

/**
 * Remove undefined values from an object
 * Firestore doesn't accept undefined values
 *
 * @param obj - Object to clean
 * @returns New object without undefined values
 */

export function removeUndefined<T extends object>(obj: T): Partial<T> {
  const cleaned: any = {};

  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];

    if (value !== undefined) {
      // if it's an object, recursively clean it
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        cleaned[key] = removeUndefined(value);
      } else {
        cleaned[key] = value;
      }
    }
  });

  return cleaned;
}

export function removeNullAndUndefined<T extends object>(obj: T): Partial<T> {
  const cleaned: any = {};

  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];

    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = removeNullAndUndefined(value);
      } else {
        cleaned[key] = value;
      }
    }
  });

  return cleaned;
}

// Prepare data for Firestore by removing undefined values and adding timestamps
export function prepareForFirestore<T extends object>(
  data: T,
  isUPdate: boolean = false
): Partial<T> & { createdAt?: Date; updatedAt: Date } {
  const cleaned = removeUndefined(data);
  const timestamp = new Date();

  if (isUPdate) {
    return {
      ...cleaned,
      updatedAt: timestamp,
    };
  } else {
    return {
      ...cleaned,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
