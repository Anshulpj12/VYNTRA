/**
 * VYNTRA — Shelter Scoring Engine
 * Reads shelter state from Firestore/cache, runs score calculation,
 * and updates the shelter metadata document with the updated score.
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import type { ShelterMetadata } from '../../shared/types';
import { calculateShelterScore, type ScoreBreakdown } from './score-calculator';
import { Timestamp } from 'firebase/firestore';

/**
 * Re-evaluates and persists the score for a specific shelter.
 */
export async function recomputeAndSaveShelterScore(
  shelterId: string
): Promise<ScoreBreakdown | null> {
  if (!navigator.onLine) {
    // Return baseline calculation if offline
    return calculateShelterScore({
      shelterId,
      totalBedCapacity: 40,
      availableBeds: 24,
    });
  }

  try {
    const metaRef = doc(db, PATHS.shelterMetadata(shelterId));
    const snap = await getDoc(metaRef);

    if (!snap.exists()) {
      return null;
    }

    const metadata = snap.data() as ShelterMetadata;
    const breakdown = calculateShelterScore(metadata);

    // Write computed score back to metadata document
    await updateDoc(metaRef, {
      shelterScore: breakdown.totalScore,
      lastUpdatedAt: Timestamp.now(),
    });

    return breakdown;
  } catch (err) {
    console.warn(`Could not update score for shelter ${shelterId}:`, err);
    return null;
  }
}
