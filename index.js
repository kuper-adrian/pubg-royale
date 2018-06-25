/* eslint class-methods-use-this: "off" */

/**
 * @typedef {Object} ClientOptions
 * @property {string} key Your PUBG API key. Required.
 * @property {string} defaultRegion Default region used for api request. If omitted, defaults to
 * 'pc-na'.
 */

const https = require('https');
const { Cache } = require('clean-cache');

const PUBG_API_HOST_NAME = 'api.playbattlegrounds.com';
const REGIONS = {
  PC: {
    EU: 'pc-eu',
    NA: 'pc-na',
    RU: 'pc-ru',
    OC: 'pc-oc',
    KAKAO: 'pc-kakao',
    SEA: 'pc-sea',
    SA: 'pc-sa',
    AS: 'pc-as',
    JP: 'pc-jp',
    KRJP: 'pc-krjp',
  },
  XBOX: {
    EU: 'xbox-eu',
    NA: 'xbox-na',
    OC: 'xbox-oc',
    AS: 'xbox-as',
  },
};

// TODO make ttls configurable
const playerByIdCache = new Cache(120 * 1000);
const playerByNameCache = new Cache(1200 * 1000);
const statusCache = new Cache(60 * 1000);
const seasonsCache = new Cache(3600 * 1000);
const playerStatsCache = new Cache(600 * 1000);
const matchByIdCache = new Cache(300 * 1000);

function getApiOptions(path) {
  return {
    path,
    hostname: PUBG_API_HOST_NAME,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TODO}`, // TODO
      Accept: 'application/vnd.api+json',
    },
  };
}

/**
 *
 * @param {Object} options Request options object
 * @param {Function} resolve Callback that is called, when the api request succeeded
 * @param {Function} reject Callback that is called, when an error occures
 * @param {Cache} cache Cache to store results in.
 */
function apiRequest(options, resolve, reject, cache) {
  const cachedObject = cache.retrieve(options.path);
  if (cachedObject !== null) {
    if (cachedObject instanceof Error) {
      reject(cachedObject);
    } else {
      resolve(cachedObject);
    }
  } else {
    https.get(options, (resp) => {
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received.
      resp.on('end', () => {
        const apiData = JSON.parse(data);

        if (apiData.errors !== undefined && apiData.errors.length > 0) {
          let errorMessage = apiData.errors[0].title;
          if (apiData.errors[0].detail !== undefined) {
            errorMessage += `. Details: ${apiData.errors[0].detail}`;
          }
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
   * @param {ClientOptions} options object to customize behaviour
   */
  constructor(options) {
    if (options.defaultRegion !== undefined) {
      this.defaultRegion = options.defaultRegion;
    } else {
      this.defaultRegion = REGIONS.PC.NA;
    }
  }

  player(options) {
    let region = '';
    let id = '';
    let name = '';

    if (options.region !== undefined) {
      region = options.region;
    } else {
      region = this.defaultRegion;
    }

    if (options.id !== undefined) {
      id = options.id;
    } else if (options.name !== undefined) {
      
    }
    // TODO
  }

  playerStats(options) {
    // TODO
  }

  status() {
    return new Promise((resolve, reject) => {
      const options = getApiOptions('/status');
      return apiRequest(options, resolve, reject, statusCache);
    });
  }

  seasons(options) {
    // TODO
  }

  match(options) {
    // TODO
  }
}

/**
 * Creates a promise to get PUBG API info about player
 *
 * @param {string} name pubg player name
 */
exports.playerByName = function playerByName(name, region) {
  return new Promise((resolve, reject) => {
    const options = getApiOptions(`/shards/${region}/players?filter[playerNames]=${name}`);
    return apiRequest(options, resolve, reject, playerByNameCache);
  });
};

/**
 * Creates a promise to get PUBG api info about player
 *
 * @param {string} id pubg id of player
 */
exports.playerById = function playerById(id, region) {
  return new Promise((resolve, reject) => {
    const options = getApiOptions(`/shards/${region}/players/${id}`);
    return apiRequest(options, resolve, reject, playerByIdCache);
  });
};

/**
 * Creates a promise to get the current status of the pubg api
 */
exports.status = function status() {
  return new Promise((resolve, reject) => {
    const options = getApiOptions('/status');
    return apiRequest(options, resolve, reject, statusCache);
  });
};

/**
 * Creates a promise to get all seasons.
 */
exports.seasons = function seasons(region) {
  return new Promise((resolve, reject) => {
    const options = getApiOptions(`/shards/${region}/seasons`);
    return apiRequest(options, resolve, reject, seasonsCache);
  });
};

/**
 * Creates a promise to get the lifetime stats of a player during the given season.
 *
 * @param {string} pubgId PUBG API Id of player
 * @param {string} seasonId PUBG API Id of season
 */
exports.playerStats = function playerStats(pubgId, seasonId, region) {
  return new Promise((resolve, reject) => {
    const options = getApiOptions(`/shards/${region}/players/${pubgId}/seasons/${seasonId}`);
    apiRequest(options, resolve, reject, playerStatsCache);
  });
};

/**
 * Creates a promise to get infos about match identified by the
 * given id.
 *
 * @param {string} matchId the match id
 */
exports.matchById = function matchById(matchId, region) {
  return new Promise((resolve, reject) => {
    const options = getApiOptions(`/shards/${region}/matches/${matchId}`);
    apiRequest(options, resolve, reject, matchByIdCache);
  });
};


exports.Client = PubgRoyaleClient;
exports.REGIONS = REGIONS;
