/**
 * Type definitions for NWS API responses
 */

// Common types
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export interface QuantitativeValue {
  value: number | null;
  unitCode: string;
  qualityControl?: string;
}

// Alert types
export interface Alert {
  id: string;
  areaDesc: string;
  geocode: {
    SAME?: string[];
    UGC?: string[];
  };
  affectedZones: string[];
  references: any[];
  sent: string;
  effective: string;
  onset: string | null;
  expires: string;
  ends: string | null;
  status: 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft';
  messageType: 'Alert' | 'Update' | 'Cancel' | 'Ack' | 'Error';
  category: 'Met' | 'Geo' | 'Safety' | 'Security' | 'Rescue' | 'Fire' | 'Health' | 'Env' | 'Transport' | 'Infra' | 'CBRNE' | 'Other';
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
  event: string;
  sender: string;
  senderName: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  response: 'Shelter' | 'Evacuate' | 'Prepare' | 'Execute' | 'Avoid' | 'Monitor' | 'Assess' | 'AllClear' | 'None';
  parameters: {
    [key: string]: any[];
  };
}

export interface AlertCollection {
  '@context': any;
  type: 'FeatureCollection';
  features: Array<{
    id: string;
    type: 'Feature';
    geometry: GeoJsonPolygon | GeoJsonMultiPolygon | null;
    properties: Alert;
  }>;
  title?: string;
  updated?: string;
  pagination?: {
    next?: string;
  };
}

// Forecast types
export interface Period {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  temperatureTrend: string | null;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface Forecast {
  '@context': any;
  type: 'Feature';
  geometry: GeoJsonPolygon;
  properties: {
    updated: string;
    units: 'us' | 'si';
    forecastGenerator: string;
    generatedAt: string;
    updateTime: string;
    validTimes: string;
    elevation: QuantitativeValue;
    periods: Period[];
  };
}

// Gridpoint forecast types
export interface GridpointForecast {
  '@context': any;
  type: 'Feature';
  geometry: GeoJsonPolygon;
  properties: {
    updateTime: string;
    validTimes: string;
    elevation: QuantitativeValue;
    forecastOffice: string;
    gridId: string;
    gridX: number;
    gridY: number;
    temperature: GridpointValue;
    dewpoint: GridpointValue;
    relativeHumidity: GridpointValue;
    windSpeed: GridpointValue;
    windDirection: GridpointValue;
    windGust: GridpointValue | null;
    weather: WeatherValue[];
    hazards: HazardValue[];
    probabilityOfPrecipitation: GridpointValue;
    quantitativePrecipitation: GridpointValue;
    iceAccumulation: GridpointValue;
    snowfallAmount: GridpointValue;
    snowLevel: GridpointValue | null;
    ceilingHeight: GridpointValue;
    visibility: GridpointValue;
    transportWindSpeed: GridpointValue;
    transportWindDirection: GridpointValue;
    mixingHeight: GridpointValue;
    hainesIndex: GridpointValue;
    lightningActivityLevel: GridpointValue;
    twentyFootWindSpeed: GridpointValue;
    twentyFootWindDirection: GridpointValue;
    waveHeight: GridpointValue | null;
    wavePeriod: GridpointValue | null;
    waveDirection: GridpointValue | null;
    primarySwellHeight: GridpointValue | null;
    primarySwellDirection: GridpointValue | null;
    primarySwellPeriod: GridpointValue | null;
    secondarySwellHeight: GridpointValue | null;
    secondarySwellDirection: GridpointValue | null;
    secondarySwellPeriod: GridpointValue | null;
    wavePeriod2: GridpointValue | null;
    windWaveHeight: GridpointValue | null;
    apparentTemperature: GridpointValue;
    skyCover: GridpointValue;
    windChill: GridpointValue;
    heatIndex: GridpointValue;
    atmosphericDispersionIndex: GridpointValue;
    lowVisibilityOccurrenceRiskIndex: GridpointValue;
    stability: GridpointValue;
    redFlagThreatIndex: GridpointValue;
  };
}

export interface GridpointValue {
  uom: string;
  values: Array<{
    validTime: string;
    value: number | null;
  }>;
}

export interface WeatherValue {
  validTime: string;
  value: Array<{
    coverage: string | null;
    weather: string | null;
    intensity: string | null;
    visibility: QuantitativeValue;
    attributes: any[];
  }>;
}

export interface HazardValue {
  validTime: string;
  value: Array<{
    phenomenon: string;
    significance: string;
    event_number: number | null;
  }>;
}

// Station types
export interface Station {
  '@context': any;
  '@id': string;
  '@type': 'wx:ObservationStation';
  elevation: QuantitativeValue;
  stationIdentifier: string;
  name: string;
  timeZone: string;
  forecast: string;
  county: string;
  fireWeatherZone: string;
}

export interface StationCollection {
  '@context': any;
  type: 'FeatureCollection';
  features: Array<{
    id: string;
    type: 'Feature';
    geometry: GeoJsonPoint;
    properties: Station;
  }>;
  observationStations?: string[];
  pagination?: {
    next?: string;
  };
}

// Fire Weather Zone types
export interface FireWeatherZone {
  '@context': any;
  '@id': string;
  '@type': 'wx:FireWeatherZone';
  id: string;
  type: 'Feature';
  geometry: GeoJsonMultiPolygon | GeoJsonPolygon;
  properties: {
    '@id': string;
    '@type': 'wx:FireWeatherZone';
    id: string;
    type: 'fire';
    name: string;
    effectiveDate: string;
    expirationDate: string;
    state: string;
    forecastOffices: string[];
    observationStations: string[];
    timeZone: string[];
  };
}

// Point types
export interface Point {
  '@context': any;
  type: 'Feature';
  geometry: GeoJsonPoint;
  properties: {
    '@id': string;
    '@type': 'wx:Point';
    cwa: string;
    forecastOffice: string;
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    relativeLocation: {
      type: 'Feature';
      geometry: GeoJsonPoint;
      properties: {
        city: string;
        state: string;
        distance: QuantitativeValue;
        bearing: QuantitativeValue;
      };
    };
    forecastZone: string;
    county: string;
    fireWeatherZone: string;
    timeZone: string;
    radarStation: string;
  };
}

// Error response
export interface NWSError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId: string;
  path?: string;
  parameters?: any;
}