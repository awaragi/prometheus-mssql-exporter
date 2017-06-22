const debug = require("debug")("app");
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const app = require('express')();

var collectInterval = null;
var connection = null;
const client = require('./metrics').client;
const up = require('./metrics').up;
const metrics = require('./metrics').metrics;

var config = {
    connect: {
        server: process.env["SERVER"],
        userName: process.env["USERNAME"],
        password: process.env["PASSWORD"],
        options: {
            encrypt: true,
            rowCollectionOnRequestCompletion: true
        }
    },
    reconnect: process.env["RECONNECT"] || 5000,
    interval: process.env["INTERVAL"] || 1000,
    port: process.env["EXPOSE"] || 4000
};

if (!config.connect.server) {
    throw new Error("Missing SERVER information")
}
if (!config.connect.userName) {
    throw new Error("Missing USERNAME information")
}
if (!config.connect.password) {
    throw new Error("Missing PASSWORD information")
}

/**
 * Connects to a database server and if successful starts the metrics collection interval.
 */
function connect() {
    debug("Connecting to database", config.connect.server);
    var _connection = new Connection(config.connect);

    _connection.on('connect', function (err) {
        if (err) {
            console.error("Failed to connect to database:", err.message || err);
        } else {
            debug("Connected to database");
            connection = _connection;
            collectInterval = setInterval(collect, config.interval);
        }
    });
    _connection.on('end', function () {
        debug("Connection to database ended");
        dead();
    });
}

/**
 * Recursive function that executes all collectors sequentially
 * @param collectors {metric: Metric, query: string, collect: function(rows, metric)}
 */
function measure(collectors) {
    if(connection) {
        const collector = collectors.shift();
        connection.execSql(new Request(collector.query, function (err, rowCount, rows) {
            if (!err) {
                collector.collect(rows, collector.metric);
            }
            if (collectors.length) {
                measure(collectors)
            }
        }));
    }
}

/**
 * Function that collects from an active server. Should be called via setInterval setup.
 */
function collect() {
    if (connection) {
        up.set(1);
        measure(metrics.slice());
    }
}

/**
 * Function that marks the server as unavailable and unable to receive any queries
 */
function dead() {
    debug("Unable to query database");
    up.set(0);

    connection = null;
    if (collectInterval) {
        clearImmediate(collectInterval);
    }
    collectInterval = null;
    setTimeout(connect, config.reconnect);
}

app.get('/metrics', function (req, res) {
    res.contentType(client.register.contentType);
    if (collectInterval) {
        res.send(client.register.metrics())
    } else {
        res.send(client.register.getSingleMetricAsString("UP"));
    }
});

app.listen(config.port, function () {
    debug('Prometheus-MSSQL Exporter listening on local port', config.port);
});

process.on('SIGINT', function () {
    if (collectInterval) {
        clearImmediate(collectInterval);
    }
    process.exit();
});

connect();
