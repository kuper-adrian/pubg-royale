# PUBG Royale
This is a PUBG API wrapper for Node.js with built-in caching that originated from the [statg](https://github.com/kuper-adrian/statg-bot) discord bot. There might be better wrappers out there, but feel free to use this one if you like ;)

## Features
* Get infos and statistics about players, matches, seasons, api status.
* All api calls are asynchronious with promises.
* Results are cached. Cache timings can be configured.
* API results are automatically parsed to Javascript objects.
* API errors are converted to native Javascript errors for easier error handling.

Telemetry data is missing for the moment, but might be added in the future. The composition of the objects returned by `pubg-royle` match the JSON returned by the PUBG API. So be sure to read the relevant parts of the official [docs](https://documentation.playbattlegrounds.com/en/introduction.html).

## Install
```
npm install pubg-royale
```
Also make sure to grab a key for the PUBG API [here](https://developer.playbattlegrounds.com/). 
**IMPORTANT:** Keep your key secret!

## Use
```javascript
const pubgRoyale = require('pubg-royale');

const client = new pubgRoyale.Client({
  // Put your api key here
  key: 'YOUR_KEY_HERE',

  // Default region used for api calls. Defaults to pc-na if omitted.
  // The region can be set for individual api calls.
  defaultRegion: pubgRoyale.REGIONS.PC.EU,

  // Specifies ttl in ms for cached objects. Any value ommited defaults to 60 seconds.
  // Set every value to zero to disable caching
  cache: { 
    player: 10 * 1000,
    playerStats: 10 * 1000,
    match: 10 * 1000,
    status: 10 * 1000,
    seasons: 10 * 1000,
  },
});

client.player({ name: 'JohnDoe' })
  .then((player) => {
    // do something with the player
  })
  .catch((error) => {
    // handle error
  });
```

## Changelog

### 1.1.0
* Support for pubg api v6.0.0 style seasons stats url format (fixes [#4](i4))

## License
MIT

[i4]: https://github.com/kuper-adrian/pubg-royale/issues/4
