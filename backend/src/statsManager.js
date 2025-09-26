const stats = {};

function updateStats(playerName) {
  if (!stats[playerName]) {
    stats[playerName] = { wins: 0 };
  }
  stats[playerName].wins += 1;
}

function getStats() {
  return stats;
}

module.exports = { updateStats, getStats };
