const appLog = require("debug")("app");
const dbLog = require("debug")("db");
const queriesLog = require("debug")("queries");

const Connection = require("tedious").Connection;
const Request = require("tedious").Request;
const app = require("express")();

const client = require("./metrics").client;
const mssql_up = require("./metrics").mssql_up;
const metrics = require("./metrics").metrics;

let config = {
  connect: {
    server: process.env["SERVER"],
    authentication: {
      type: "default",
      options: {
        userName: process.env["USERNAME"],
        password: process.env["PASSWORD"],
      },
    },
    options: {
      port: parseInt(process.env["PORT"]) || 1433,
      encrypt: true,
      trustServerCertificate: true,
      rowCollectionOnRequestCompletion: true,
    },
  },
  port: parseInt(process.env["EXPOSE"]) || 4000,
};

if (!config.connect.server) {
  throw new Error("Missing SERVER information");
}
if (!config.connect.authentication.options.userName) {
  throw new Error("Missing USERNAME information");
}
if (!config.connect.authentication.options.password) {
  throw new Error("Missing PASSWORD information");
}

/**
 * Connects to a database server and if successful starts the metrics collection interval.
 *
 * @returns Promise<Connection>
 */
async function connect() {
  return new Promise((resolve, reject) => {
    dbLog("Connecting to database", config.connect.server, "using user", config.connect.authentication.options.userName);
    let connection = new Connection(config.connect);
    connection.on("connect", (error) => {
      if (error) {
        console.error("Failed to connect to database:", error.message || error);
        reject(error);
      } else {
        dbLog("Connected to database");
        resolve(connection);
      }
    });
    connection.on("end", () => {
      dbLog("Connection to database ended");
    });
    connection.connect();
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
    queriesLog(`Executing query: ${collector.query}`);
    let request = new Request(collector.query, (error, rowCount, rows) => {
      if (!error) {
        queriesLog(`Retrieved rows ${JSON.stringify(rows, null, 2)}`);
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
  mssql_up.set(1);
  for (let i = 0; i < metrics.length; i++) {
    await measure(connection, metrics[i]);
  }
}

app.get("/", (req, res) => {
  res.redirect("/metrics");
});

app.get("/metrics", async (req, res) => {
  res.contentType(client.register.contentType);

  try {
    appLog("Received metrics request");
    let connection = await connect();
    await collect(connection, metrics);
    connection.close();
    res.send(client.register.metrics());
    appLog("Successfully processed metrics request");
  } catch (error) {
    // error connecting
    appLog("Error handling metrics request");
    mssql_up.set(0);
    res.header("X-Error", error.message || error);
    res.send(client.register.getSingleMetricAsString(mssql_up.name));
  }
});

const server = app.listen(config.port, function () {
  appLog(
    `Prometheus-MSSQL Exporter listening on local port ${config.port} monitoring ${config.connect.authentication.options.userName}@${config.connect.server}:${config.connect.options.port}`
  );
});

process.on("SIGINT", function () {
  server.close();
  process.exit(0);
});
