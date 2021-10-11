const debug = require("debug")("app");
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const app = require('express')();

const client = require('./metrics').client;
const up = require('./metrics').up;
const metrics = require('./metrics').metrics;

const userName = process.env["USERNAME"];
const password = process.env["PASSWORD"];
const serverName = process.env["SERVER"];
const portNumber = parseInt(process.env["PORT"]) || 1433;

let config = {
    connect: {
        authentication: {
            type: 'default',
            options: {
                userName: userName,
                password: password,
            }
        },
        server: serverName,
        options: {
            port: portNumber,
            encrypt: true,
            rowCollectionOnRequestCompletion: true
        }
    },
    port: parseInt(process.env["EXPOSE"]) || 4000
};

if (!serverName) {
    throw new Error("Missing SERVER information")
}
if (!userName) {
    throw new Error("Missing USERNAME information")
}
if (!password) {
    throw new Error("Missing PASSWORD information")
}

/**
 * Connects to a database server and if successful starts the metrics collection interval.
 *
 * @returns Promise<Connection>
 */
async function connect() {
    return new Promise((resolve, reject) => {
        try {
            debug("Connecting to database", serverName);
            let connection = new Connection(config.connect);
            connection.on('connect', (error) => {
                if (error) {
                    console.error("Failed to connect to database:", error.message || error);
                    reject(error);
                } else {
                    debug("Connected to database");
                    resolve(connection);
                }
            });
            connection.on('end', () => {
                debug("Connection to database ended");
            });
            connection.connect();
        } catch (e) {
            debug("Exception caught", e);
            throw e;
        }
    });

}

/**
 * Recursive function that executes all collectors sequentially
 *
 * @param connection database connection
 * @param collector single metric: {query: string, collect: function(rows, metric)}
 *
 * @returns Promise of collect operation (no value returned)
 */
async function measure(connection, collector) {
    return new Promise((resolve) => {
        let request = new Request(collector.query, (error, rowCount, rows) => {
            if (!error) {
                collector.collect(rows, collector.metrics);
                resolve();
            } else {
                console.error("Error executing SQL query", collector.query, error);
                resolve();
            }
        });
        connection.execSql(request);
    });
}

/**
 * Function that collects from an active server.
 *
 * @param connection database connection
 *
 * @returns Promise of execution (no value returned)
 */
async function collect(connection) {
    up.set(1);
    for (let i = 0; i < metrics.length; i++) {
        await measure(connection, metrics[i]);
    }
}

app.get('/healthcheck', (req, res) => {
    res.send("OK");
})

app.get('/metrics', async (req, res) => {
    res.contentType(client.register.contentType);

    try {
        let connection = await connect();
        await collect(connection, metrics);
        connection.close();
        res.send(await client.register.metrics());
    } catch (error) {
        // error connecting
        up.set(0);
        res.header("X-Error", error.message || error);
        res.send(await client.register.getSingleMetricAsString(up.name));
    }
});

const server = app.listen(config.port, function () {
    debug(`Prometheus-MSSQL Exporter listening on local port ${config.port} monitoring ${userName}@${serverName}:${portNumber}`);
});

process.on('SIGINT', function () {
    server.close();
    process.exit(0);
});
