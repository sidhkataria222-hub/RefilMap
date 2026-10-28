import { getStationRecommendation } from './src/services/recommendationService.js';
import { INITIAL_STATIONS, REPORT_ISSUE_CATEGORIES } from './src/data/stationsData.js';
import { CAMPUS_BUILDINGS } from './src/data/campusBuildings.js';
import { getStationDistance, formatDistance, estimateWalkTime } from './src/utils/distance.js';

console.log('--- Running RefillMap Automated Test Suite ---');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    failedTests++;
  }
}

// 1. Test Configurable Campus Buildings
assert(CAMPUS_BUILDINGS.length === 5, 'Configurable campus buildings has 5 items');
assert(CAMPUS_BUILDINGS.some(b => b.name === 'Academic Block A'), 'Academic Block A exists');
assert(CAMPUS_BUILDINGS.some(b => b.name === 'Academic Block B'), 'Academic Block B exists');
assert(CAMPUS_BUILDINGS.some(b => b.name === 'Computer Science Block'), 'Computer Science Block exists');
assert(CAMPUS_BUILDINGS.some(b => b.name === 'Central Library'), 'Central Library exists');
assert(CAMPUS_BUILDINGS.some(b => b.name === 'Student Activity Centre'), 'Student Activity Centre exists');

// 2. Test Building-Dependent Distance Recommendations
const recLibrary = getStationRecommendation(INITIAL_STATIONS, 'Central Library', 'any');
assert(recLibrary.primaryStation.name === 'PureFlow Central Foyer', 'Nearest station to Central Library is PureFlow Central Foyer');
assert(getStationDistance(recLibrary.primaryStation, 'Central Library') === 20, 'Distance from Central Library is 20m');

const recCS = getStationRecommendation(INITIAL_STATIONS, 'Computer Science Block', 'any');
assert(recCS.primaryStation.name === 'CS Innovation Hub Smart Oasis', 'Nearest station to CS Block is CS Innovation Hub');
assert(getStationDistance(recCS.primaryStation, 'Computer Science Block') === 20, 'Distance from CS Block is 20m');

const recSAC = getStationRecommendation(INITIAL_STATIONS, 'Student Activity Centre', 'any');
assert(recSAC.primaryStation.name === 'SAC Sports & Fitness Hydration Bar', 'Nearest station to SAC is SAC Sports Hydration Bar');

const recBlockB = getStationRecommendation(INITIAL_STATIONS, 'Academic Block B', 'any');
assert(recBlockB.primaryStation.name === 'Block B Main Concourse Refill Bar', 'Nearest station to Block B is Block B Main Concourse');

// 3. Test Maintenance Exclusion: Under Maintenance stations must never be recommended
const underMaintenanceStation = INITIAL_STATIONS.find(s => s.operationalStatus === 'Under Maintenance');
assert(underMaintenanceStation.id === 4, 'Found Station 4 under maintenance');
assert(recLibrary.primaryStation.id !== 4, 'Primary station is not under maintenance');
assert(recCS.primaryStation.id !== 4, 'Primary station is not under maintenance');
assert(recSAC.primaryStation.id !== 4, 'Primary station is not under maintenance');
assert(recBlockB.primaryStation.id !== 4, 'Primary station is not under maintenance');

// In Block A, Station 4 (Dean's wing) is 60m away, but is Under Maintenance.
// Station 3 (Garden Court) is 30m away and Working.
const recBlockA = getStationRecommendation(INITIAL_STATIONS, 'Academic Block A', 'any');
assert(recBlockA.primaryStation.id === 3, 'Nearest working station in Block A is Station 3, excluding Station 4');

// 4. Test Water Preferences & Fallback Explanation
// When preference is 'normal' in Academic Block A:
const recBlockANormal = getStationRecommendation(INITIAL_STATIONS, 'Academic Block A', 'normal');
assert(recBlockANormal.primaryStation.temperature === 'Normal Water', 'Returns Normal Water when preferred');
assert(recBlockANormal.isPreferenceMatched === true, 'Preference matched is true');

// When preference is 'cold' in Academic Block A:
// Station 4 in Block A has cold water, but is under maintenance!
// The recommendation should recommend the nearest working cold station (Block B at 140m):
const recBlockACold = getStationRecommendation(INITIAL_STATIONS, 'Academic Block A', 'cold');
assert(recBlockACold.primaryStation.temperature === 'Cold Water', 'Returns nearest working Cold Water station');
assert(recBlockACold.primaryStation.id === 5, 'Station 5 (Block B Concourse) is nearest working cold water station from Block A');

// Test fallback explanation when NO cold water stations exist at all:
const allAmbientStations = INITIAL_STATIONS.map(s => ({ ...s, temperature: 'Normal Water' }));
const recFallback = getStationRecommendation(allAmbientStations, 'Academic Block A', 'cold');
assert(recFallback.isPreferenceMatched === false, 'Preference matched is false when no cold water available');
assert(recFallback.preferenceExplanation.includes('preferred Cold Water'), 'Provides clear explanation why ambient was recommended');

// 5. Test Alternative Functioning Stations
assert(recLibrary.alternativeStations.length >= 2, 'Returns alternative functioning stations');
assert(recLibrary.alternativeStations.every(s => s.id !== recLibrary.primaryStation.id), 'Alternatives do not include primary station');
assert(recLibrary.alternativeStations.every(s => s.operationalStatus !== 'Under Maintenance'), 'Alternatives do not include maintenance stations');

// 6. Test Missing Distance Handling
const missingDistanceStation = {
  id: 99,
  name: 'Unknown Distance Kiosk',
  building: 'Central Library',
  operationalStatus: 'Working',
  temperature: 'Cold Water',
  distanceMatrix: {} // empty distance
};
assert(getStationDistance(missingDistanceStation, 'Central Library') === null, 'Missing distance returns null');
assert(formatDistance(null) === 'Estimate unavailable', 'Missing distance formats as Estimate unavailable');
assert(estimateWalkTime(null) === 'Estimate pending', 'Missing distance walk time formats as Estimate pending');

// 7. Test Issue Categories per Requirement 5
const expectedCategories = [
  'No water',
  'Low pressure',
  'Filter maintenance',
  'Water quality concern',
  'Damaged equipment',
  'Other'
];
expectedCategories.forEach(cat => {
  assert(REPORT_ISSUE_CATEGORIES.some(c => c.value === cat), `Required issue category '${cat}' exists`);
});

// 8. Test Edge Cases (Section 3 Requirements)
// Edge Case A: Empty stations array
const recEmpty = getStationRecommendation([], 'Central Library', 'any');
assert(recEmpty.hasNoFunctioningStations === true, 'Edge Case: Empty stations array marks hasNoFunctioningStations true');
assert(recEmpty.primaryStation === null, 'Edge Case: Empty stations returns null primaryStation');

// Edge Case B: All stations under maintenance
const allMaintenanceStations = INITIAL_STATIONS.map(s => ({ ...s, operationalStatus: 'Under Maintenance' }));
const recAllMaintenance = getStationRecommendation(allMaintenanceStations, 'Central Library', 'any');
assert(recAllMaintenance.hasNoFunctioningStations === true, 'Edge Case: All stations under maintenance marks hasNoFunctioningStations true');
assert(recAllMaintenance.primaryStation === null, 'Edge Case: All stations under maintenance returns null primaryStation');

// Edge Case C: Unknown status stations are excluded from primary recommendation
const unknownStation = INITIAL_STATIONS.find(s => s.operationalStatus === 'Unknown');
assert(unknownStation !== undefined, 'Edge Case: Sample data contains Unknown status station');
assert(recSAC.primaryStation.id !== unknownStation.id, 'Edge Case: Unknown status station excluded from primary recommendation');

// Edge Case D: All stations with Unknown status
const allUnknownStations = INITIAL_STATIONS.map(s => ({ ...s, operationalStatus: 'Unknown' }));
const recAllUnknown = getStationRecommendation(allUnknownStations, 'Central Library', 'any');
assert(recAllUnknown.hasNoFunctioningStations === true, 'Edge Case: All Unknown status stations excluded from primary recommendation');

console.log(`\nResults: ${passedTests} passed, ${failedTests} failed.`);
if (failedTests > 0) process.exit(1);
