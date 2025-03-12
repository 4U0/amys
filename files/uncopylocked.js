// ==UserScript==
// @name         Roblox Game Info Display
// @namespace    https://amy.coffee/
// @version      1.0
// @description  Display game info on the Roblox game search page.
// @match        https://www.roblox.com/discover/*
// @grant        GM_xmlhttpRequest
// @connect      games.roproxy.com
// @connect      apis.roproxy.com
// @connect      users.roblox.com
// ==/UserScript==


(function () {
    "use strict";

    const gameInfoCache = {
      data: {},

      set: function(universeId, gameInfo) {
        this.data[universeId] = {
          timestamp: Date.now(),
          info: gameInfo
        };

        try {
          const cacheData = JSON.stringify(this.data);
          localStorage.setItem('robloxGameInfoCache', cacheData);
        } catch (e) {
          console.error("Error saving cache to localStorage:", e);
        }
      },

      get: function(universeId) {
        const entry = this.data[universeId];
        if (!entry) return null;

        const expired = Date.now() - entry.timestamp > 24 * 60 * 60 * 1000;
        return expired ? null : entry.info;
      },

      load: function() {
        try {
          const cacheData = localStorage.getItem('robloxGameInfoCache');
          if (cacheData) {
            this.data = JSON.parse(cacheData);

            const now = Date.now();
            Object.keys(this.data).forEach(key => {
              if (now - this.data[key].timestamp > 24 * 60 * 60 * 1000) {
                delete this.data[key];
              }
            });
          }
        } catch (e) {
          console.error("Error loading cache from localStorage:", e);
          this.data = {};
        }
      }
    };

    function fetchWithRetry(url, options = {}, maxRetries = 2) {
      return new Promise((resolve, reject) => {
        const attemptFetch = (retriesLeft) => {
          GM_xmlhttpRequest({
            method: options.method || "GET",
            url: url,
            onload: function(response) {
              try {
                const data = JSON.parse(response.responseText);
                resolve(data);
              } catch (e) {
                console.error(`Error parsing response from ${url}:`, e);
                if (retriesLeft > 0) {
                  console.log(`Retrying... (${retriesLeft} attempts left)`);
                  setTimeout(() => attemptFetch(retriesLeft - 1), 1000);
                } else {
                  reject(e);
                }
              }
            },
            onerror: function(err) {
              console.error(`Error fetching from ${url}:`, err);
              if (retriesLeft > 0) {
                console.log(`Retrying... (${retriesLeft} attempts left)`);
                setTimeout(() => attemptFetch(retriesLeft - 1), 1000);
              } else {
                reject(err);
              }
            }
          });
        };

        attemptFetch(maxRetries);
      });
    }

    function markTileAsLoading(tile) {
      if (tile.querySelector('.game-info-loading') || tile.querySelector('.game-info-container')) {
        return;
      }

      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'game-info-loading';
      loadingIndicator.style.position = 'absolute';
      loadingIndicator.style.top = '5px';
      loadingIndicator.style.right = '5px';
      loadingIndicator.style.backgroundColor = 'rgba(20, 25, 35, 0.7)';
      loadingIndicator.style.color = 'white';
      loadingIndicator.style.fontSize = '11px';
      loadingIndicator.style.padding = '4px 6px';
      loadingIndicator.style.borderRadius = '4px';
      loadingIndicator.style.zIndex = '10';

      loadingIndicator.innerHTML = '<div class="loading-dots">Loading<span>.</span><span>.</span><span>.</span></div>';

      tile.style.position = 'relative';
      tile.appendChild(loadingIndicator);
    }

    function removeTileLoading(tile) {
      const loadingIndicator = tile.querySelector('.game-info-loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
    }

    function updateTileWithGameInfo(tile, game) {
      removeTileLoading(tile);

      if (tile.querySelector(".game-info-container")) return;

      const showCopylock = localStorage.getItem('show-copylock') !== 'false';
      const showVisits = localStorage.getItem('show-visits') !== 'false';
      const showUpdated = localStorage.getItem('show-updated') !== 'false';
      const uncopylockOnly = localStorage.getItem('uncopylocked-only') === 'true';
      const hidecopylocked = localStorage.getItem('hide-copylocked') === 'true';

      tile.dataset.copylockStatus = game.copyingAllowed ? "uncopylocked" : "copylocked";

      if (hidecopylocked && !game.copyingAllowed) {
        tile.style.display = "none";
        return;
      }

      if (!showCopylock && !showVisits && !showUpdated) return;

      if (uncopylockOnly && !game.copyingAllowed) {
        const miniIndicator = document.createElement("div");
        miniIndicator.className = "game-info-container mini-indicator";
        miniIndicator.style.position = "absolute";
        miniIndicator.style.top = "5px";
        miniIndicator.style.right = "5px";
        miniIndicator.style.backgroundColor = "rgba(220, 53, 69, 0.7)";
        miniIndicator.style.width = "8px";
        miniIndicator.style.height = "8px";
        miniIndicator.style.borderRadius = "50%";
        miniIndicator.style.zIndex = "10";
        tile.style.position = "relative";
        tile.appendChild(miniIndicator);
        return;
      }

      const container = document.createElement("div");
      container.className = "game-info-container";
      container.style.position = "absolute";
      container.style.top = "5px";
      container.style.right = "5px";
      container.style.backgroundColor = "rgba(20, 25, 35, 0.85)";
      container.style.color = "white";
      container.style.fontSize = "11px";
      container.style.padding = "6px 8px";
      container.style.borderRadius = "6px";
      container.style.zIndex = "10";
      container.style.textAlign = "right";
      container.style.lineHeight = "1.3";
      container.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      container.style.backdropFilter = "blur(2px)";
      container.style.border = "1px solid rgba(255,255,255,0.1)";

      const formattedVisits = game.visits.toLocaleString();

      if (showCopylock) {
        const statusBadge = document.createElement("span");
        statusBadge.textContent = game.copyingAllowed ? "UNCOPYLOCKED" : "COPYLOCKED";
        statusBadge.style.display = "inline-block";
        statusBadge.style.padding = "2px 5px";
        statusBadge.style.borderRadius = "3px";
        statusBadge.style.fontSize = "9px";
        statusBadge.style.fontWeight = "bold";
        statusBadge.style.marginBottom = "3px";
        statusBadge.style.backgroundColor = game.copyingAllowed ? "rgba(40, 167, 69, 0.8)" : "rgba(220, 53, 69, 0.8)";
        container.appendChild(statusBadge);
      }

      if (showVisits) {
        const visitsLine = document.createElement("div");
        visitsLine.innerHTML = `<span style="opacity:0.8;">👁️</span> ${formattedVisits}`;
        container.appendChild(visitsLine);
      }

      if (showUpdated) {
        const updatedDate = new Date(game.updated);
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const formattedDate = updatedDate.toLocaleDateString(undefined, dateOptions);

        const updatedLine = document.createElement("div");
        updatedLine.innerHTML = `<span style="opacity:0.8;">🔄</span> ${formattedDate}`;
        container.appendChild(updatedLine);
      }

      tile.style.position = "relative";
      tile.appendChild(container);
    }

    function fetchUniverseForTile(tile, link) {
      const url = new URL(link.href);
      const placeId = url.searchParams.get("placeId");
      if (!placeId) return;

      markTileAsLoading(tile);

      fetchWithRetry(`https://apis.roproxy.com/universes/v1/places/${placeId}/universe`)
        .then(data => {
          if (data && data.universeId) {
            tile.dataset.universeId = data.universeId;
            link.id = data.universeId;
            fetchGameInfoForUniverse(data.universeId, tile);
          } else {
            removeTileLoading(tile);
          }
        })
        .catch(err => {
          console.error("Error fetching universe for tile", err);
          removeTileLoading(tile);
        });
    }

    function fetchGameInfoForUniverse(universeId, tile) {
      const cachedInfo = gameInfoCache.get(universeId);
      if (cachedInfo) {
        updateTileWithGameInfo(tile, cachedInfo);
        return;
      }

      markTileAsLoading(tile);

      fetchWithRetry(`https://games.roproxy.com/v1/games?universeIds=${universeId}`)
        .then(data => {
          if (data && data.data && data.data.length > 0) {
            const game = data.data[0];
            gameInfoCache.set(universeId, game);
            updateTileWithGameInfo(tile, game);
          } else {
            removeTileLoading(tile);
          }
        })
        .catch(err => {
          console.error("Error fetching game info for universe", err);
          removeTileLoading(tile);
        });
    }

    function fetchGameInfoForUniverses(universeIds, mapping) {
      if (universeIds.length === 0) return;

      universeIds.forEach(uniId => {
        if (mapping[uniId]) {
          mapping[uniId].forEach(tile => {
            markTileAsLoading(tile);
          });
        }
      });

      const url = `https://games.roproxy.com/v1/games?universeIds=${universeIds.join(",")}`;

      fetchWithRetry(url)
        .then(result => {
          if (result && result.data) {
            result.data.forEach((game) => {
              const uniId = String(game.id);
              gameInfoCache.set(uniId, game);

              if (mapping[uniId]) {
                mapping[uniId].forEach((tile) => {
                  updateTileWithGameInfo(tile, game);
                });
              }
            });
          }

          universeIds.forEach(uniId => {
            if (mapping[uniId]) {
              mapping[uniId].forEach(tile => {
                removeTileLoading(tile);
              });
            }
          });
        })
        .catch(err => {
          console.error("Error fetching batch game info", err);
          universeIds.forEach(uniId => {
            if (mapping[uniId]) {
              mapping[uniId].forEach(tile => {
                removeTileLoading(tile);
              });
            }
          });
        });
    }

    function updateFilteredResultsCount() {
      const hidecopylocked = localStorage.getItem('hide-copylocked') === 'true';

      if (!hidecopylocked) {
        const existingCounter = document.getElementById('uncopylocked-counter');
        if (existingCounter) {
          existingCounter.remove();
        }
        return;
      }

      const allGames = document.querySelectorAll(".game-card-container[data-testid='game-tile']");
      const visibleGames = document.querySelectorAll(".game-card-container[data-testid='game-tile']:not([style*='display: none'])");
      const uncopylocked = document.querySelectorAll(".game-card-container[data-testid='game-tile'][data-copylock-status='uncopylocked']");

      let counter = document.getElementById('uncopylocked-counter');
      if (!counter) {
        counter = document.createElement('div');
        counter.id = 'uncopylocked-counter';
        counter.style.position = 'fixed';
        counter.style.top = '70px';
        counter.style.right = '20px';
        counter.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
        counter.style.color = 'white';
        counter.style.padding = '5px 10px';
        counter.style.borderRadius = '4px';
        counter.style.zIndex = '1000';
        counter.style.fontSize = '12px';
        counter.style.fontWeight = 'bold';
        counter.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        document.body.appendChild(counter);
      }

      counter.textContent = `Showing ${visibleGames.length} uncopylocked games`;
    }

    function processAllTiles() {
      const tiles = document.querySelectorAll(".game-card-container[data-testid='game-tile']:not([data-copylock-checked='true'])");
      const mapping = {};
      const universeIds = [];
      const needsPlaceIdLookup = [];

      tiles.forEach((tile) => {
        tile.dataset.copylockChecked = "true";

        const link = tile.querySelector("a.game-card-link");
        if (!link) return;

        if (link.id && /^\d+$/.test(link.id)) {
          const uniId = link.id;
          tile.dataset.universeId = uniId;

          const cachedInfo = gameInfoCache.get(uniId);
          if (cachedInfo) {
            updateTileWithGameInfo(tile, cachedInfo);
            return;
          }

          if (mapping[uniId]) {
            mapping[uniId].push(tile);
          } else {
            mapping[uniId] = [tile];
            universeIds.push(uniId);
          }
        } else {
          needsPlaceIdLookup.push({ tile, link });
        }
      });

      const batchSize = 50;
      for (let i = 0; i < universeIds.length; i += batchSize) {
        const batch = universeIds.slice(i, i + batchSize);
        if (batch.length > 0) {
          setTimeout(() => {
            fetchGameInfoForUniverses(batch, mapping);
            setTimeout(updateFilteredResultsCount, 500);
          }, Math.floor(i/batchSize) * 500);
        }
      }

      needsPlaceIdLookup.forEach((item, index) => {
        setTimeout(() => {
          fetchUniverseForTile(item.tile, item.link);
          if (index % 10 === 0) {
            setTimeout(updateFilteredResultsCount, 300);
          }
        }, index * 100);
      });

      setTimeout(updateFilteredResultsCount, 1000);
    }

    function addSettingsPanel() {
      if (document.getElementById('roblox-info-settings')) return;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes loadingDots {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .loading-dots span {
          animation: loadingDots 1.4s infinite;
          animation-fill-mode: both;
        }
        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Added styles for filter section */
        .settings-section {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 8px;
          margin-top: 10px;
        }
        .settings-section-title {
          font-weight: bold;
          margin-bottom: 5px;
          font-size: 11px;
          color: rgba(255,255,255,0.8);
        }
      `;
      document.head.appendChild(style);

      const panel = document.createElement('div');
      panel.id = 'roblox-info-settings';
      panel.style.position = 'fixed';
      panel.style.bottom = '20px';
      panel.style.right = '20px';
      panel.style.backgroundColor = 'rgba(20, 25, 35, 0.9)';
      panel.style.color = 'white';
      panel.style.padding = '10px';
      panel.style.borderRadius = '8px';
      panel.style.zIndex = '9999';
      panel.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      panel.style.fontSize = '12px';
      panel.style.transition = 'transform 0.3s ease';
      panel.style.transform = 'translateY(90%)';
      panel.style.cursor = 'pointer';
      panel.style.border = '1px solid rgba(255,255,255,0.1)';
      panel.style.width = '220px';

      panel.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;text-align:center;">Game Info Display</div>
        <div id="roblox-info-settings-content" style="display:none;padding-top:5px;">
          <div class="settings-section-title">Display Options</div>
          <label style="display:block;margin-bottom:8px;">
            <input type="checkbox" id="show-copylock" checked> Show Copylock Status
          </label>
          <label style="display:block;margin-bottom:8px;">
            <input type="checkbox" id="show-visits" checked> Show Visit Count
          </label>
          <label style="display:block;margin-bottom:8px;">
            <input type="checkbox" id="show-updated" checked> Show Update Date
          </label>

          <div class="settings-section">
            <div class="settings-section-title">Filter Options</div>
            <label style="display:block;margin-bottom:8px;">
              <input type="checkbox" id="uncopylocked-only"> Only Show Info for Uncopylocked
            </label>
            <label style="display:block;margin-bottom:8px;">
              <input type="checkbox" id="hide-copylocked"> Hide Copylocked Games
            </label>
          </div>

          <button id="clear-cache" style="width:100%;padding:4px;margin-top:10px;background:#3a4154;border:none;color:white;border-radius:4px;cursor:pointer;">Clear Cache</button>
        </div>
      `;

      document.body.appendChild(panel);

      panel.addEventListener('click', function(e) {
        if (e.target.id === 'clear-cache') {
          gameInfoCache.data = {};
          localStorage.removeItem('robloxGameInfoCache');
          alert('Cache cleared!');
          window.location.reload();
          return;
        }

        const content = document.getElementById('roblox-info-settings-content');
        if (content.style.display === 'none' || !content.style.display) {
          content.style.display = 'block';
          panel.style.transform = 'translateY(0)';
        } else if (e.target === panel || e.target.nodeName !== 'INPUT') {
          content.style.display = 'none';
          panel.style.transform = 'translateY(90%)';
        }
      });

      document.getElementById('show-copylock').addEventListener('change', function() {
        localStorage.setItem('show-copylock', this.checked);
        window.location.reload();
      });

      document.getElementById('show-visits').addEventListener('change', function() {
        localStorage.setItem('show-visits', this.checked);
        window.location.reload();
      });

      document.getElementById('show-updated').addEventListener('change', function() {
        localStorage.setItem('show-updated', this.checked);
        window.location.reload();
      });

      document.getElementById('uncopylocked-only').addEventListener('change', function() {
        localStorage.setItem('uncopylocked-only', this.checked);
        window.location.reload();
      });

      document.getElementById('hide-copylocked').addEventListener('change', function() {
        localStorage.setItem('hide-copylocked', this.checked);

        if (this.checked) {
          document.getElementById('uncopylocked-only').checked = false;
          localStorage.setItem('uncopylocked-only', false);
        }

        window.location.reload();
      });

      document.getElementById('show-copylock').checked =
        localStorage.getItem('show-copylock') !== 'false';
      document.getElementById('show-visits').checked =
        localStorage.getItem('show-visits') !== 'false';
      document.getElementById('show-updated').checked =
        localStorage.getItem('show-updated') !== 'false';
      document.getElementById('uncopylocked-only').checked =
        localStorage.getItem('uncopylocked-only') === 'true';
      document.getElementById('hide-copylocked').checked =
        localStorage.getItem('hide-copylocked') === 'true';
    }

    function main() {
      gameInfoCache.load();

      addSettingsPanel();

      processAllTiles();

      const observer = new MutationObserver((mutations) => {
        let tilesAdded = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (
                node.matches &&
                node.matches(".game-card-container[data-testid='game-tile']")
              ) {
                tilesAdded = true;
              } else if (node.querySelectorAll) {
                const newTiles = node.querySelectorAll(
                  ".game-card-container[data-testid='game-tile']"
                );
                if (newTiles.length > 0) {
                  tilesAdded = true;
                }
              }
            }
          });
        });
        if (tilesAdded) {
          processAllTiles();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      console.log("Roblox Game Info Display initialized successfully!");
    }

    main();
  })();
