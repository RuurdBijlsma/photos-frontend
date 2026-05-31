async function getRawSunTimes() {
  const { ip } = await (await fetch('https://api.ipify.org?format=json')).json()
  const locationInfo = await (await fetch(`https://tools.keycdn.com/geo.json?host=${ip}`)).json()
  const lat = locationInfo.data.geo.latitude
  const lon = locationInfo.data.geo.longitude
  // Use the Sunrise Sunset API to get the data
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
  const response = await fetch(url)
  if (!response.ok) throw new Error('NOT OK' + response.statusText)
  const data = await response.json()

  // Return an object with the sunrise and sunset times as Date objects
  return {
    sunrise: new Date(data.results.sunrise),
    sunset: new Date(data.results.sunset),
  }
}
