// Globally-aggregated stats
const currentStats = {
    users: 0,
    servers: 0,
    cytubeChannels: 0
}

/**
 * Update stats based on info from the Eris connection and active Cyborg shards
 * @param eris The eris connection.
 * @param cyborgInstances A {serverId: Cyborg{}} map of all Cyborg shards.
 */
function updateStats(eris, cyborgInstances) {
    currentStats.users = eris.guilds.map(x => x.memberCount).reduce((a, c) => a + c);
    currentStats.servers = eris.guilds.size,
    currentStats.cytubeChannels = Object.keys(cyborgInstances).map(x => cyborgInstances[x].config.cyChannels.length).reduce((a, c) => a + c);
}

module.exports = {
    currentStats,
    updateStats
}