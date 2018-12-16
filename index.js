/* eslint class-methods-use-this: "off" */

/**
 * Options object to specify ttl for cached objects.
 * @typedef {Object} CacheOptions
 * @property {number} player ttl in ms for player objects to be cached
 * @property {number} playerStats ttl in ms for player statistic objects to be cached
 * @property {number} seasons ttl in ms for seasons objects to be cached
 * @property {number} status ttl in ms for status objects to be cached
 * @property {number} match ttl in ms for match objects to be cached
 */

/**
 * Options object for pubg api client constructor.
 * @typedef {Object} PubgRoyaleClientOptions
 * @property {string} key Your PUBG API key. Required.
 * @property {string} defaultRegion Default region used for api request. If omitted, defaults to
 * 'pc-na'.
 * @property {CacheOptions} cache Object to configure ttl for cached objects.
 */

/**
 * Options object for player request. Either "id" or "name" property is required. Omitting
 * both causes a rejected promise. If both are specified the id will be used.
 * @typedef {Object} PlayerOptions
 * @property {string} region Region used for finding player. If omitted, client default will be
 * used.
 * @property {string} id Pubg api player id used for finding player.
 * @property {string} name Pubg player name used for finding player.
 */

/**
 * Options object for player statistics request.
 * @typedef {Object} PlayerStatsOptions
 * @property {string} region Region of player. If omitted, client default is used.
 * @property {string} playerId Pubg api player id. Required.
 * @property {string} seasonId Pubg api season id. Required.
 */

/**
 * Options object for Telemetry.
 * @typedef {Object} TelemetryOptions
 * @property {string} region Region of player. If omitted, client default is used.
 * @property {string} matchId Id obtained from player() which has this format
 * "1ad97f85-cf9b-11e7-b84e-0a586460f004". Required
 */


/**
 * Options object for seasons request.
 * @typedef {Object} SeasonsOptions
 * @property {string} region Region used to get seasons. If omitted, client default is used.
 */

/**
 * Options object for match request.
 * @typedef {Object} MatchOptions
 * @property {string} region Region used to get match. If omitted, client default is used.
 * @property {string} id Pubg api match id. Required.
 */

/**
 * Options for getting telemetry URL
 * @typedef {Object} TelemetryURLOptions
 * @property {JSON} jsonResponse returned value from telemetry()
 */

const https = require('https');
const { Cache } = require('clean-cache');

const PUBG_API_HOST_NAME = 'api.pubg.com';
const REGIONS = {
  PC: {
    STEAM: 'steam',
    KAKAO: 'kakao',
  },
};

/**
 * Creates HTTP request options for api call.
 * @param {string} apiKey pubg api key
 * @param {string} path sub url path for api request
 */
function getApiOptions(apiKey, path) {
  return {
    path,
    hostname: PUBG_API_HOST_NAME,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/vnd.api+json',
    },
  };
}

/**
 * Makes api request. Caches objects based on requested path.
 * @param {Object} options Request options object
 * @param {Function} resolve Callback that is called, when the api request succeeded
 * @param {Function} reject Callback that is called, when an error occures
 * @param {Cache} cache Cache to store and retrieve results.
 */
function apiRequest(options, cache, resolve, reject) {
  // first, check whether there already is the requested object in cache
  const cachedObject = cache.retrieve(options.path);
  if (cachedObject !== null) {
    if (cachedObject instanceof Error) {
      // reject promise if request caused error previously
      reject(cachedObject);
    } else {
      // resolve the request with cached object
      resolve(cachedObject);
    }
  } else {
    // ... no cached object, so start the http get request
    https.get(options, (resp) => {
      let data = '';

      // a chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // the whole response has been received.
      resp.on('end', () => {
        const apiData = JSON.parse(data);

        // if an api error object was received...
        if (apiData.errors !== undefined && apiData.errors.length > 0) {
          // ...gather error info...
          let errorMessage = apiData.errors[0].title;
          if (apiData.errors[0].detail !== undefined) {
            errorMessage += `. Details: ${apiData.errors[0].detail}`;
          }
          // ... and reject promise with proper error
          const apiError = new Error(errorMessage);
          cache.add(options.path, apiError);
          reject(apiError);
        } else {
          cache.add(options.path, apiData);
          resolve(apiData);
        }
      });
    }).on('error', (err) => {
      cache.add(options.path, err);
      reject(err);
    });
  }
}

/**
 * Client class for access to pubg api.
 */
class PubgRoyaleClient {
  /**
   * Constructor
   * @param {PubgRoyaleClientOptions} options object to customize behaviour
   */
  constructor(options) {
    if (options === undefined) {
      throw new Error('No options parameter specified.');
    }

    if (options.key === undefined || options.key === null) {
      throw new Error('Api key must be specified');
    } else {
      this.apiKey = options.key;
    }

    if (options.defaultRegion !== undefined) {
      this.defaultRegion = options.defaultRegion;
    } else {
      this.defaultRegion = REGIONS.PC.STEAM;
    }

    const defaultTtl = 60 * 1000;

    if (options.cache !== undefined) {
      const { cache: cacheSettings } = options;

      if (cacheSettings.player !== undefined) {
        this.playerCache = new Cache(cacheSettings.player);
      } else {
        this.playerCache = new Cache(defaultTtl);
      }

      if (cacheSettings.playerStats !== undefined) {
        this.playerStatsCache = new Cache(cacheSettings.playerStats);
      } else {
        this.playerStatsCache = new Cache(defaultTtl);
      }

      if (cacheSettings.status !== undefined) {
        this.statusCache = new Cache(cacheSettings.status);
      } else {
        this.statusCache = new Cache(defaultTtl);
      }

      if (cacheSettings.seasons !== undefined) {
        this.seasonsCache = new Cache(cacheSettings.seasons);
      } else {
        this.seasonsCache = new Cache(defaultTtl);
      }

      if (cacheSettings.match !== undefined) {
        this.matchCache = new Cache(cacheSettings.match);
      } else {
        this.matchCache = new Cache(defaultTtl);
      }

      if (cacheSettings.tournaments !== undefined) {
        this.tournamentsCache = new Cache(cacheSettings.tournaments);
      } else {
        this.tournamentsCache = new Cache(defaultTtl);
      }

      if (cacheSettings.tournament !== undefined) {
        this.tournamentCache = new Cache(cacheSettings.tournament);
      } else {
        this.tournamentCache = new Cache(defaultTtl);
      }
    } else {
      this.playerCache = new Cache(defaultTtl);
      this.playerStatsCache = new Cache(defaultTtl);
      this.statusCache = new Cache(defaultTtl);
      this.seasonsCache = new Cache(defaultTtl);
      this.matchCache = new Cache(defaultTtl);
      this.tournamentsCache = new Cache(defaultTtl);
      this.tournamentCache = new Cache(defaultTtl);
    }
  }

  /**
   * Creates a promise to get PUBG api info about player
   * @param {PlayerOptions} options Options for api call.
   * @returns {Promise} Promise to get player
   */
  player(options) {
    let region = '';

    if (options === undefined) {
      return Promise.reject(new Error('No options parameter defined for player api request'));
    }

    if (options.region !== undefined) {
      ({ region } = options);
    } else {
      region = this.defaultRegion;
    }

    if (options.id === undefined && options.name === undefined) {
      return Promise.reject(new Error('No player id or name specified through "id" or "name" option'));
    }

    if (options.id !== undefined) {
      return new Promise((resolve, reject) => {
        const apiOptions = getApiOptions(this.apiKey, `/shards/${region}/players/${options.id}`);
        return apiRequest(apiOptions, this.playerCache, resolve, reject);
      });
    }

    // use name instead
    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(
        this.apiKey,
        `/shards/${region}/players?filter[playerNames]=${options.name}`,
      );
      return apiRequest(apiOptions, this.playerCache, resolve, reject);
    });
  }

  /**
   * Creates a promise to get some telemetry info.
   * @param {TelemetryOptions} options Options for api call.
   * @returns {Promise} Promise to get player stats.
   */
  telemetry(options) {
    let region = '';

    if (options === undefined) {
      return Promise.reject(new Error('No options parameter defined for telemetry api request'));
    }

    if (options.region !== undefined) {
      ({ region } = options);
    } else {
      region = this.defaultRegion;
    }

    if (options.matchId === undefined) {
      return Promise.reject(new Error('No "matchId" passed as an option'));
    }

    // Using matchId
    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(
        this.apiKey,
        `/shards/${region}/matches/${options.matchId}`,
      );
      return apiRequest(apiOptions, this.playerCache, resolve, reject);
    });
  }

  /**
   * Creates a promise to get the lifetime stats of a player during the given season.
   * @param {PlayerStatsOptions} options Options for api call.
   * @returns {Promise} Promise to get player stats.
   */
  playerStats(options) {
    let region = '';
    let playerId = '';
    let seasonId = '';

    if (options === undefined) {
      return Promise.reject(new Error('No options parameter defined for player stats api request'));
    }

    if (options.region !== undefined) {
      ({ region } = options);
    } else {
      region = this.defaultRegion;
    }

    if (options.playerId === undefined) {
      return Promise.reject(new Error('No player id specified through "playerId" option'));
    }
    if (options.seasonId === undefined) {
      return Promise.reject(new Error('No season id specified through "seasonId" option'));
    }
    ({ playerId, seasonId } = options);

    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(
        this.apiKey,
        `/shards/${region}/players/${playerId}/seasons/${seasonId}`,
      );
      apiRequest(apiOptions, this.playerStatsCache, resolve, reject);
    });
  }

  /**
   * Creates a promise to get the current status of the pubg api.
   * @returns {Promise} Promise to get api status
   */
  status() {
    return new Promise((resolve, reject) => {
      const options = getApiOptions(this.apiKey, '/status');
      return apiRequest(options, this.statusCache, resolve, reject);
    });
  }

  /**
   * Creates a promise to get all seasons.
   * @param {SeasonsOptions} options Options for api call.
   * @returns {Promise} Promise to get seasons
   */
  seasons(options) {
    let region = '';

    if (options === undefined) {
      region = this.defaultRegion;
    } else if (options.region !== undefined) {
      ({ region } = options);
    } else {
      region = this.defaultRegion;
    }

    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(this.apiKey, `/shards/${region}/seasons`);
      return apiRequest(apiOptions, this.seasonsCache, resolve, reject);
    });
  }

  /**
   * Creates a promise to get infos about match identified by the
   * given id.
   * @param {MatchOptions} options Options for api call.
   * @returns {Promise} Promise to get match
   */
  match(options) {
    let region = '';
    let matchId = '';

    if (options === undefined) {
      return Promise.reject(new Error('No options parameter defined for match api request'));
    }

    if (options.region !== undefined) {
      ({ region } = options);
    } else {
      region = this.defaultRegion;
    }

    if (options.id === undefined) {
      return Promise.reject(new Error('No match id specified through "id" option'));
    }
    ({ id: matchId } = options);

    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(this.apiKey, `/shards/${region}/matches/${matchId}`);
      apiRequest(apiOptions, this.matchCache, resolve, reject);
    });
  }

  /**
   * Returns the json file URL from telemetry
   * Use it after calling telemetry() in your code
   * @param {JSON} jsonReturned
   * @returns {String} Telemetry file URL
   */
  getTelemetryURL(jsonReturned) {
    const asset = jsonReturned.included.filter((val, index, arr) => {
      if (val.type === 'asset') {
        return arr;
      }
      return undefined;
    });
    if (asset !== undefined) {
      return asset[0].attributes.URL;
    }
    return undefined;
  }

  /**
   * Creates a promise to get all tournaments.
   * @param {TournamentsOptions} options Options for api call.
   * @returns {Promise} Promise to get tournaments
   */
  tournaments() {
    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(this.apiKey, '/tournaments');
      return apiRequest(apiOptions, this.tournamentsCache, resolve, reject);
    });
  }

  /**
   * Creates a promise to get infos about a tournament identified
   * by the given id.
   * @param {TournamentOptions} options Options for api call.
   * @returns {Promise} Promise to get tournament
   */
  tournament(options) {
    let tournamentId = '';

    if (options === undefined) {
      return Promise.reject(new Error('No options parameter defined for tournament api request'));
    }

    if (options.id === undefined) {
      return Promise.reject(new Error('No tournament id specified through "id" option'));
    }
    ({ id: tournamentId } = options);

    return new Promise((resolve, reject) => {
      const apiOptions = getApiOptions(this.apiKey, `/tournaments/${tournamentId}`);
      apiRequest(apiOptions, this.tournamentCache, resolve, reject);
    });
  }
}

exports.Client = PubgRoyaleClient;
exports.REGIONS = REGIONS;
