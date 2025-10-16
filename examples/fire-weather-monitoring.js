/**
 * Example: Fire Weather Monitoring for Southwest Coordination Center
 *
 * This example demonstrates how to use the weather-mcp tools to monitor
 * fire weather conditions across Arizona and New Mexico.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

async function main() {
  // Create MCP client
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['../dist/index.js'],
  });

  const client = new Client(
    {
      name: 'fire-weather-monitor',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  console.log('Connected to weather-mcp server');
  console.log('\\n=== FIRE WEATHER MONITORING FOR SOUTHWEST ===\\n');

  try {
    // 1. Check for Red Flag Warnings in Arizona
    console.log('1. Checking Red Flag Warnings in Arizona...');
    const azWarnings = await client.callTool('get_fire_weather_alerts', {
      area: 'AZ',
      urgency: 'Immediate',
    });

    const azData = JSON.parse(azWarnings.content[0].text);
    if (azData.success) {
      console.log(`   Found ${azData.data.count} active fire weather alerts in Arizona`);
      azData.data.alerts.forEach(alert => {
        console.log(`   - ${alert.event}: ${alert.headline}`);
        console.log(`     Areas: ${alert.areas}`);
        console.log(`     Expires: ${alert.expires}`);
      });
    }

    // 2. Check New Mexico fire weather
    console.log('\\n2. Checking Red Flag Warnings in New Mexico...');
    const nmWarnings = await client.callTool('get_fire_weather_alerts', {
      area: 'NM',
      urgency: 'Immediate',
    });

    const nmData = JSON.parse(nmWarnings.content[0].text);
    if (nmData.success) {
      console.log(`   Found ${nmData.data.count} active fire weather alerts in New Mexico`);
    }

    // 3. Get specific fire weather zone details (Phoenix area)
    console.log('\\n3. Getting Phoenix fire weather zone details (AZZ149)...');
    const zoneInfo = await client.callTool('get_fire_weather_zone', {
      zoneId: 'AZZ149',
    });

    const zoneData = JSON.parse(zoneInfo.content[0].text);
    if (zoneData.success) {
      console.log(`   Zone: ${zoneData.data.zone.name}`);
      console.log(`   State: ${zoneData.data.zone.state}`);
      console.log(`   Active Alerts: ${zoneData.data.activeAlerts.length}`);
    }

    // 4. Calculate fire danger index for Tucson
    console.log('\\n4. Calculating fire danger index for Tucson...');
    const dangerIndex = await client.callTool('get_fire_danger_index', {
      latitude: 32.2226,
      longitude: -110.9747,
      hours: 48,
    });

    const dangerData = JSON.parse(dangerIndex.content[0].text);
    if (dangerData.success) {
      console.log(`   Max Danger Index: ${dangerData.data.summary.maxDangerIndex}`);
      console.log(`   Average Danger Index: ${dangerData.data.summary.avgDangerIndex}`);
      console.log(`   Critical Hours: ${dangerData.data.summary.criticalHours}`);

      // Show next 24 hours
      console.log('\\n   Hourly breakdown (next 24 hours):');
      dangerData.data.indices.slice(0, 24).forEach(hour => {
        console.log(`   ${hour.time}: ${hour.dangerLevel} (${hour.dangerIndex}) - Temp: ${hour.temperature}°F, RH: ${hour.relativeHumidity}%, Wind: ${hour.windSpeed} mph`);
      });
    }

    // 5. Get forecast for Flagstaff (high fire risk area)
    console.log('\\n5. Getting forecast for Flagstaff...');
    const forecast = await client.callTool('get_point_forecast', {
      latitude: 35.1983,
      longitude: -111.6513,
      days: 3,
    });

    const forecastData = JSON.parse(forecast.content[0].text);
    if (forecastData.success) {
      console.log('   3-day forecast:');
      forecastData.data.forecast.forEach(day => {
        console.log(`   ${day.date}:`);
        console.log(`     Day: ${day.day.temperature}°F, ${day.day.windSpeed}, ${day.day.shortForecast}`);
        if (day.night) {
          console.log(`     Night: ${day.night.temperature}°F, ${day.night.windSpeed}, ${day.night.shortForecast}`);
        }
      });
    }

    // 6. Check severe weather alerts across Southwest
    console.log('\\n6. Checking severe weather alerts...');
    const severeAlerts = await client.callTool('get_severe_weather_alerts', {
      area: 'AZ',
    });

    const severeData = JSON.parse(severeAlerts.content[0].text);
    if (severeData.success && severeData.data.count > 0) {
      console.log(`   Found ${severeData.data.count} severe weather alerts`);
      if (severeData.data.mostSevere) {
        console.log(`   Most severe: ${severeData.data.mostSevere.event}`);
        console.log(`   Areas: ${severeData.data.mostSevere.areas}`);
      }
    } else {
      console.log('   No severe weather alerts currently active');
    }

    // 7. Find weather stations in fire zones
    console.log('\\n7. Finding weather stations in fire zones...');
    const fireStations = await client.callTool('get_fire_weather_stations', {
      state: 'AZ',
      limit: 5,
    });

    const stationData = JSON.parse(fireStations.content[0].text);
    if (stationData.success) {
      console.log(`   Found ${stationData.data.count} fire weather stations`);
      console.log(`   Zones covered: ${stationData.data.zones.join(', ')}`);
      stationData.data.stations.slice(0, 5).forEach(station => {
        console.log(`   - ${station.id}: ${station.name} (Zone: ${station.fireWeatherZone})`);
      });
    }

    console.log('\\n=== MONITORING COMPLETE ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await transport.close();
  }
}

// Run the example
main().catch(console.error);