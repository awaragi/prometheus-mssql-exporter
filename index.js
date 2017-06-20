var interval = null;
var connection = null;
const Connection = require('tedious').Connection;
const app = require('express')();
const client = require('prom-client');
const metrics = {
    up: new client.Gauge({name: 'UP', help: "UP Status"}),
    connections: new client.Counter({name: 'mssql_connections', help: 'Number of active connections'}),
};

var config = {
    connect: {
        server: process.env["SERVER"],
        userName: process.env["USERNAME"],
        password: process.env["PASSWORD"],
        options: {
            encrypt: true
        },
    },
    reconnect: process.env["RECONNECT"] || 1000,
    interval: process.env["INTERVAL"] || 1000,
    port: process.env["EXPOSE"] || 4000
};

if (!config.connect.server) {
    throw new Error("Missing HOST information")
}
if (!config.connect.userName) {
    throw new Error("Missing USERNAME information")
}
if (!config.connect.password) {
    throw new Error("Missing PASSWORD information")
}

function connect() {
    console.log("Connecting to database", config.connect.server);
    connection = new Connection(config.connect);

    connection.on('connect', function (err) {
        if (err) {
            console.error("Failed to connect to database", err);
        } else {
            console.log("Connected to database");
            interval = setInterval(collect, config.interval);
        }
    });
    connection.on('end', function (err) {
        if (err) {
            console.error("Connection to database ended with error", error);

        } else {
            console.log("Connection to database ended");
        }
        dead();
        setTimeout(connect, config.reconnect);
    });
}

function collect() {
    console.log("Collecting statistics");
    metrics.up.set(1);
}

function dead() {
    if (interval) {
        clearImmediate(interval);
    }
    interval = null;
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
    console.log('Prometheus-MSSQL Exporter listening on local port', config.port);
});

process.on('SIGINT', function() {
    if(interval) {
        clearImmediate(interval);
    }
    process.exit();
});

dead();
connect();
