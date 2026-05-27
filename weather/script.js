// API Configuration
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Get from https://openweathermap.org/api
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const currentWeatherSection = document.getElementById('currentWeather');
const hourlySection = document.getElementById('hourlySection');
const dailySection = document.getElementById('dailySection');
const savedCitiesSection = document.getElementById('savedCities');
const saveBtn = document.getElementById('saveBtn');

// State
let currentCity = null;
let currentWeatherData = null;
let savedCities = JSON.parse(localStorage.getItem('savedCities')) || [];

// Event Listeners
searchBtn.addEventListener('click', () => handleSearch());
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
geoBtn.addEventListener('click', () => getCurrentLocation());
saveBtn.addEventListener('click', () => toggleSaveCity());

// Search Handler
async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Por favor ingresa una ciudad');
        return;
    }
    await fetchWeatherByCity(city);
}

// Fetch Weather by City Name
async function fetchWeatherByCity(cityName) {
    try {
        showLoading(true);
        clearError();

        const response = await fetch(
            `${WEATHER_API_URL}/weather?q=${cityName}&appid=${API_KEY}&units=metric&lang=es`
        );

        if (!response.ok) {
            if (response.status === 404) {
                showError('Ciudad no encontrada. Intenta nuevamente.');
            } else {
                showError('Error al obtener datos meteorológicos.');
            }
            return;
        }

        const data = await response.json();
        currentCity = {
            name: data.name,
            country: data.sys.country,
            lat: data.coord.lat,
            lon: data.coord.lon
        };

        await Promise.all([
            fetchCurrentWeather(data.coord.lat, data.coord.lon),
            fetchHourlyForecast(data.coord.lat, data.coord.lon),
            fetchDailyForecast(data.coord.lat, data.coord.lon),
            fetchAirQuality(data.coord.lat, data.coord.lon)
        ]);

        searchInput.value = '';
    } catch (error) {
        console.error('Error:', error);
        showError('Error al obtener los datos. Verifica tu conexión.');
    } finally {
        showLoading(false);
    }
}

// Get Current Location
async function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Tu navegador no soporta geolocalización.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoordinates(latitude, longitude);
        },
        (error) => {
            showError('No se pudo acceder a tu ubicación.');
            console.error('Geolocation error:', error);
        }
    );
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoordinates(lat, lon) {
    try {
        showLoading(true);
        clearError();

        const response = await fetch(
            `${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`
        );

        if (!response.ok) throw new Error('Failed to fetch weather');

        const data = await response.json();
        currentCity = {
            name: data.name,
            country: data.sys.country,
            lat: data.coord.lat,
            lon: data.coord.lon
        };

        await Promise.all([
            fetchCurrentWeather(lat, lon),
            fetchHourlyForecast(lat, lon),
            fetchDailyForecast(lat, lon),
            fetchAirQuality(lat, lon)
        ]);
    } catch (error) {
        console.error('Error:', error);
        showError('Error al obtener datos de tu ubicación.');
    } finally {
        showLoading(false);
    }
}

// Fetch Current Weather
async function fetchCurrentWeather(lat, lon) {
    const response = await fetch(
        `${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`
    );
    const data = await response.json();
    currentWeatherData = data;
    displayCurrentWeather(data);
}

// Display Current Weather
function displayCurrentWeather(data) {
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('weatherDate').textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°`;
    document.getElementById('weatherDesc').textContent = data.weather[0].description;
    document.getElementById('weatherIcon').src =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed)} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°`;
    document.getElementById('minMax').textContent =
        `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;

    currentWeatherSection.style.display = 'block';

    // Update save button state
    updateSaveButtonState();
}

// Fetch Hourly Forecast
async function fetchHourlyForecast(lat, lon) {
    const response = await fetch(
        `${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`
    );
    const data = await response.json();
    displayHourlyForecast(data.list.slice(0, 24));
}

// Display Hourly Forecast
function displayHourlyForecast(forecasts) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = '';

    forecasts.forEach((forecast, index) => {
        const time = new Date(forecast.dt * 1000);
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="hourly-time">${time.getHours().toString().padStart(2, '0')}:00</div>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" 
                 alt="Weather icon" class="hourly-icon">
            <div class="hourly-temp">${Math.round(forecast.main.temp)}°</div>
            <div class="hourly-condition">${forecast.weather[0].main}</div>
        `;
        container.appendChild(card);
    });

    hourlySection.style.display = 'block';
}

// Fetch Daily Forecast
async function fetchDailyForecast(lat, lon) {
    const response = await fetch(
        `${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`
    );
    const data = await response.json();
    const dailyForecasts = processDaily(data.list);
    displayDailyForecast(dailyForecasts.slice(0, 5));
}

// Process Daily Data from 3-Hourly Forecast
function processDaily(hourlyData) {
    const daily = {};

    hourlyData.forEach(forecast => {
        const date = new Date(forecast.dt * 1000).toLocaleDateString('es-ES');
        if (!daily[date]) {
            daily[date] = {
                date: date,
                dt: forecast.dt,
                temps: [forecast.main.temp],
                weather: forecast.weather[0],
                icon: forecast.weather[0].icon,
                humidity: forecast.main.humidity,
                wind: forecast.wind.speed,
                description: forecast.weather[0].description
            };
        } else {
            daily[date].temps.push(forecast.main.temp);
        }
    });

    return Object.values(daily);
}

// Display Daily Forecast
function displayDailyForecast(dailyForecasts) {
    const container = document.getElementById('dailyForecast');
    container.innerHTML = '';

    dailyForecasts.forEach(day => {
        const minTemp = Math.min(...day.temps);
        const maxTemp = Math.max(...day.temps);
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

        const card = document.createElement('div');
        card.className = 'daily-card';
        card.innerHTML = `
            <div class="daily-header">
                <div>
                    <div class="daily-day">${dayName}</div>
                    <div class="daily-date">${dateStr}</div>
                </div>
                <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" 
                     alt="Weather icon" class="daily-icon">
            </div>
            <div class="daily-temps">
                <span class="daily-max">↑ ${Math.round(maxTemp)}°</span>
                <span class="daily-min">↓ ${Math.round(minTemp)}°</span>
            </div>
            <div style="text-align: center; margin-bottom: 1rem; color: var(--text-color); font-size: 0.95rem;">
                ${day.description}
            </div>
            <div class="daily-details">
                <span><i class="fas fa-droplet"></i> ${day.humidity}%</span>
                <span><i class="fas fa-wind"></i> ${Math.round(day.wind)} m/s</span>
            </div>
        `;
        container.appendChild(card);
    });

    dailySection.style.display = 'block';
}

// Fetch Air Quality
async function fetchAirQuality(lat, lon) {
    try {
        const response = await fetch(
            `${WEATHER_API_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const data = await response.json();
        const aqi = data.list[0].main.aqi;
        displayAirQuality(aqi);
    } catch (error) {
        console.error('Error fetching air quality:', error);
    }
}

// Display Air Quality
function displayAirQuality(aqi) {
    const aqiBar = document.getElementById('aqiBar');
    const aqiText = document.getElementById('aqiText');
    const aqiLabels = ['Excelente', 'Bueno', 'Moderado', 'Pobre', 'Muy Pobre'];
    const aqiPercentages = [20, 40, 60, 80, 100];

    aqiBar.style.width = aqiPercentages[aqi - 1] + '%';
    aqiText.textContent = `Calidad del Aire: ${aqiLabels[aqi - 1]} (${aqi}/5)`;
}

// Toggle Save City
function toggleSaveCity() {
    if (!currentCity) return;

    const cityId = `${currentCity.name}-${currentCity.country}`;
    const existingIndex = savedCities.findIndex(c =>
        `${c.name}-${c.country}` === cityId
    );

    if (existingIndex > -1) {
        savedCities.splice(existingIndex, 1);
        saveBtn.classList.remove('saved');
    } else {
        savedCities.push(currentCity);
        saveBtn.classList.add('saved');
    }

    localStorage.setItem('savedCities', JSON.stringify(savedCities));
    displaySavedCities();
}

// Update Save Button State
function updateSaveButtonState() {
    if (!currentCity) return;

    const cityId = `${currentCity.name}-${currentCity.country}`;
    const isSaved = savedCities.some(c =>
        `${c.name}-${c.country}` === cityId
    );

    if (isSaved) {
        saveBtn.classList.add('saved');
    } else {
        saveBtn.classList.remove('saved');
    }
}

// Display Saved Cities
function displaySavedCities() {
    const container = document.getElementById('savedCitiesList');
    container.innerHTML = '';

    if (savedCities.length === 0) {
        savedCitiesSection.style.display = 'none';
        return;
    }

    savedCities.forEach(city => {
        const card = document.createElement('div');
        card.className = 'saved-city-card';
        card.innerHTML = `
            <button class="remove-city-btn" onclick="removeCity('${city.name}-${city.country}')">
                <i class="fas fa-times"></i>
            </button>
            <div class="city-name">${city.name}</div>
            <div class="city-country" style="color: var(--text-light); font-size: 0.9rem;">${city.country}</div>
        `;
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-city-btn')) {
                fetchWeatherByCoordinates(city.lat, city.lon);
            }
        });
        container.appendChild(card);
    });

    savedCitiesSection.style.display = 'block';
}

// Remove City
function removeCity(cityId) {
    savedCities = savedCities.filter(c =>
        `${c.name}-${c.country}` !== cityId
    );
    localStorage.setItem('savedCities', JSON.stringify(savedCities));
    displaySavedCities();
    updateSaveButtonState();
}

// Show/Hide Loading
function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

// Show Error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Clear Error
function clearError() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    displaySavedCities();

    if (API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
        showError('⚠️ API Key no configurada. Obtén una en https://openweathermap.org/api');
    }
});