/**
 * Contexta — services/nearbyContext.ts
 * ─────────────────────────────────────────────────────────────
 * Activity-aware nearby context suggestions.
 *
 * Generates contextually relevant suggestions based on:
 *  • Current activity (STATIC / WALKING / CYCLING / DRIVING)
 *  • Time of day (morning / afternoon / evening / night)
 *  • Distance covered this session
 */

import type { ActivityType, Suggestion } from './locationEngine';

export interface SuggestionCard {
  id:          string;
  icon:        string;
  label:       string;
  category:    string;
  distance:    string;   // estimated walking/driving distance
  relevance:   string;   // why this was suggested
  color:       string;   // accent color for the card
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function buildSuggestionCards(
  activity: ActivityType,
  distanceM: number,
): SuggestionCard[] {
  const tod = getTimeOfDay();

  const base = getBaseSuggestions(activity, tod);
  const time = getTimeSuggestions(tod, activity);

  // Merge, deduplicate by label, take top 4
  const all = [...base, ...time];
  const seen = new Set<string>();
  const unique: SuggestionCard[] = [];
  for (const s of all) {
    if (!seen.has(s.label)) {
      seen.add(s.label);
      unique.push(s);
    }
    if (unique.length >= 4) break;
  }
  return unique;
}

function getBaseSuggestions(activity: ActivityType, tod: TimeOfDay): SuggestionCard[] {
  switch (activity) {

    case 'STATIC':
      return [
        {
          id: 'cafe',
          icon: '☕',
          label: 'Nearby Café',
          category: 'Food & Drink',
          distance: '< 200m',
          relevance: 'User stationary — good time for a break',
          color: '#C69C6D',
        },
        {
          id: 'cowork',
          icon: '🏢',
          label: 'Coworking Space',
          category: 'Work',
          distance: '< 500m',
          relevance: 'Stationary context — work mode likely',
          color: '#6C63FF',
        },
        {
          id: 'supermarket',
          icon: '🛒',
          label: 'Supermarket',
          category: 'Errands',
          distance: '< 800m',
          relevance: 'Idle state — good time for errands',
          color: '#34D399',
        },
        {
          id: 'meetroom',
          icon: '🤝',
          label: 'Meeting Room',
          category: 'Work',
          distance: 'On-site',
          relevance: 'Stationary for extended duration',
          color: '#00D2FF',
        },
      ];

    case 'WALKING':
      return [
        {
          id: 'supermarket',
          icon: '🛒',
          label: 'Supermarket',
          category: 'Errands',
          distance: '~5 min walk',
          relevance: 'On-foot — quick grocery run possible',
          color: '#34D399',
        },
        {
          id: 'coffeeshop',
          icon: '☕',
          label: 'Coffee Shop',
          category: 'Food & Drink',
          distance: '~3 min walk',
          relevance: 'Walking pace — coffee pickup en route',
          color: '#C69C6D',
        },
        {
          id: 'busstop',
          icon: '🚌',
          label: 'Bus Stop',
          category: 'Transit',
          distance: '~2 min walk',
          relevance: 'Walking detected — transit option nearby',
          color: '#FFBE5C',
        },
        {
          id: 'convstore',
          icon: '🏪',
          label: 'Convenience Store',
          category: 'Errands',
          distance: '~4 min walk',
          relevance: 'Pedestrian speed inferred from GPS',
          color: '#F97316',
        },
      ];

    case 'CYCLING':
      return [
        {
          id: 'bikerepair',
          icon: '🔧',
          label: 'Bike Repair Shop',
          category: 'Services',
          distance: '~1 km',
          relevance: 'Cycling detected via GPS speed',
          color: '#6C63FF',
        },
        {
          id: 'water',
          icon: '🚰',
          label: 'Water Refill Point',
          category: 'Health',
          distance: '~500m',
          relevance: 'Sustained cycling — hydration suggested',
          color: '#00D2FF',
        },
        {
          id: 'cyclepath',
          icon: '🛣️',
          label: 'Cycle Path Ahead',
          category: 'Navigation',
          distance: 'On route',
          relevance: 'Active cycling — safe route flagged',
          color: '#34D399',
        },
        {
          id: 'quickstop',
          icon: '🏪',
          label: 'Quick Stop Store',
          category: 'Errands',
          distance: '~800m',
          relevance: 'Cycling route — stop en route',
          color: '#FFBE5C',
        },
      ];

    case 'DRIVING':
      return [
        {
          id: 'petrol',
          icon: '⛽',
          label: 'Petrol Bunk',
          category: 'Vehicle',
          distance: '~2 km',
          relevance: 'Driving speed inferred from GPS',
          color: '#FF6B6B',
        },
        {
          id: 'ev',
          icon: '🔋',
          label: 'EV Charging Station',
          category: 'Vehicle',
          distance: '~3 km',
          relevance: 'Highway speed detected',
          color: '#34D399',
        },
        {
          id: 'parking',
          icon: '🅿️',
          label: 'Parking Nearby',
          category: 'Vehicle',
          distance: '~500m',
          relevance: 'Approaching destination speed pattern',
          color: '#6C63FF',
        },
        {
          id: 'diner',
          icon: '🍔',
          label: 'Drive-through / Diner',
          category: 'Food & Drink',
          distance: '~1.5 km',
          relevance: 'In-vehicle context — meal on route',
          color: '#FFBE5C',
        },
      ];
  }
}

function getTimeSuggestions(tod: TimeOfDay, activity: ActivityType): SuggestionCard[] {
  if (tod === 'morning' && activity !== 'DRIVING') {
    return [{
      id: 'breakfast',
      icon: '🥐',
      label: 'Breakfast Spot',
      category: 'Food & Drink',
      distance: 'Nearby',
      relevance: 'Morning context — breakfast time',
      color: '#FFBE5C',
    }];
  }
  if (tod === 'evening' && activity === 'DRIVING') {
    return [{
      id: 'grocery',
      icon: '🥦',
      label: 'Grocery Store',
      category: 'Errands',
      distance: 'En route',
      relevance: 'Evening commute — grocery pickup',
      color: '#34D399',
    }];
  }
  if (tod === 'night') {
    return [{
      id: '24h',
      icon: '🌙',
      label: '24-Hour Store',
      category: 'Errands',
      distance: 'Nearby',
      relevance: 'Late night — 24h options suggested',
      color: '#A78BFA',
    }];
  }
  return [];
}
