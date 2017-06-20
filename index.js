var interval = null;
var connection = null;
const debug = require("debug")("app");
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const app = require('express')();
const client = require('prom-client');
const metrics = {
    up: new client.Gauge({name: 'UP', help: "UP Status"}),
    connections: new client.Gauge({name: 'mssql_connections', help: 'Number of active connections'}),
};

var config = {
    connect: {
        server: process.env["SERVER"],
        userName: process.env["USERNAME"],
        password: process.env["PASSWORD"],
        options: {
            encrypt: true,
            rowCollectionOnRequestCompletion: true
        },
    },
    reconnect: process.env["RECONNECT"] || 1000,
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

function connect() {
    debug("Connecting to database", config.connect.server);
    connection = new Connection(config.connect);

    connection.on('connect', function (err) {
        if (err) {
            console.error("Failed to connect to database", err);
        } else {
            debug("Connected to database");
            interval = setInterval(collect, config.interval);
        }
    });
    connection.on('end', function (err) {
        if (err) {
            console.error("Connection to database ended with error", error);

        } else {
            debug("Connection to database ended");
        }
        dead();
    });
}

function collect() {
    debug("Collecting statistics");
    metrics.up.set(1);

    connection.execSql(new Request("SELECT count(*) FROM sys.sysprocesses WHERE dbid > 0", function (err, rowCount, rows) {
        if(err) {
            dead();
        } else {
            debug("Fetch number of connections", rows[0][0].value);
            metrics.connections.set(rows[0][0].value)
        }
    }));
}

function dead() {
    if (interval) {
        clearImmediate(interval);
    }
    interval = null;
    setTimeout(connect, config.reconnect);
}

app.get('/metrics', function (req, res) {
    res.contentType(client.register.contentType);
    if (interval) {
        res.send(client.register.metrics())
    } else {
        res.send("");
    }
});

app.listen(config.port, function () {
    debug('Prometheus-MSSQL Exporter listening on local port', config.port);
});

process.on('SIGINT', function () {
    if (interval) {
        clearImmediate(interval);
    }
    process.exit();
});

dead();
