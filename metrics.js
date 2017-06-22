/**
 * Created by pierre on 22/06/17.
 */
const debug = require("debug")("metrics");
const client = require('prom-client');

// UP metric
const up = new client.Gauge({name: 'UP', help: "UP Status"});

// Query based metrics
// -------------------
const connections = {
    metric: new client.Gauge({name: 'mssql_connections_total', help: 'Number of active connections'}),
    query: "SELECT count(*) FROM sys.sysprocesses WHERE dbid > 0",
    collect: function (rows, metric) {
        debug("Fetch number of connections", rows[0][0].value);
        metric.set(rows[0][0].value);
    }
};
const deadlocks = {
    metric: new client.Gauge({name: 'mssql_deadlocks_total', help: 'Number of deadlocks/sec since last restart'}),
    query: "SELECT cntr_value FROM sys.dm_os_performance_counters WHERE object_name = 'SQLServer:Locks' AND counter_name = 'Number of Deadlocks/sec' AND instance_name = '_Total'",
    collect: function (rows, metric) {
        debug("Fetch number of deadlocks/sec", rows[0][0].value);
        metric.set(rows[0][0].value)
    }
};

module.exports = {
    client: client,
    up: up,
    metrics: [connections, deadlocks],
};
