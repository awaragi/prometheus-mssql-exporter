# Prometheus MSSQL Exporter Docker Container

Prometheus exporter for Microsoft SQL Server (MSSQL). Exposes the following metrics

- mssql_up UP Status
- mssql_product_version Instance version (Major.Minor)
- mssql_instance_local_time Number of seconds since epoch on local instance
- mssql_connections{database,state} Number of active connections
- mssql_client_connections{client,database} Number of active client connections
- mssql_deadlocks Number of lock requests per second that resulted in a deadlock since last restart
- mssql_user_errors Number of user errors/sec since last restart
- mssql_kill_connection_errors Number of kill connection errors/sec since last restart
- mssql_database_state{database} Databases states: 0=ONLINE 1=RESTORING 2=RECOVERING 3=RECOVERY_PENDING 4=SUSPECT 5=EMERGENCY 6=OFFLINE 7=COPYING 10=OFFLINE_SECONDARY
- mssql_log_growths{database} Total number of times the transaction log for the database has been expanded last restart
- mssql_database_filesize{database,logicalname,type,filename} Physical sizes of files used by database in KB, their names and types (0=rows, 1=log, 2=filestream,3=n/a 4=fulltext(before v2008 of MSSQL))
- mssql_page_read_total Page reads/sec
- mssql_page_write_total Page writes/sec
- mssql_page_life_expectancy Indicates the minimum number of seconds a page will stay in the buffer pool on this node without references. The traditional advice from Microsoft used to be that the PLE should remain above 300 seconds
- mssql_lazy_write_total Lazy writes/sec
- mssql_page_checkpoint_total Checkpoint pages/sec
- mssql_io_stall{database,type} Wait time (ms) of stall since last restart
- mssql_io_stall_total{database} Wait time (ms) of stall since last restart
- mssql_batch_requests Number of Transact-SQL command batches received per second. This statistic is affected by all constraints (such as I/O, number of users, cachesize, complexity of requests, and so on). High batch requests mean good throughput
- mssql_transactions{database} Number of transactions started for the database per second. Transactions/sec does not count XTP-only transactions (transactions started by a natively compiled stored procedure.)
- mssql_page_fault_count Number of page faults since last restart
- mssql_memory_utilization_percentage Percentage of memory utilization
- mssql_total_physical_memory_kb Total physical memory in KB
- mssql_available_physical_memory_kb Available physical memory in KB
- mssql_total_page_file_kb Total page file in KB
- mssql_available_page_file_kb Available page file in KB

Please feel free to submit other interesting metrics to include.

> This exporter has been tested against MSSQL 2017 and 2019 docker images (only ones offered by Microsoft). Other versions might be work but have not been tested.

## Usage

`docker run -e SERVER=192.168.56.101 -e USERNAME=SA -e PASSWORD=qkD4x3yy -e DEBUG=app -p 4000:4000 --name prometheus-mssql-exporter awaragi/prometheus-mssql-exporter`

The image supports the following environments and exposes port 4000

- **SERVER** server ip or dns name (required)
- **PORT** server port (optional defaults to 1433)
- **USERNAME** access user (required)
- **PASSWORD** access password (required)
- **ENCRYPT** force [encrypt](https://docs.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnectionstringbuilder.encrypt?view=dotnet-plat-ext-6.0) setting (optional defaults to true)
- **TRUST_SERVER_CERTIFICATE** sets [trustServerCertificate](https://docs.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnectionstringbuilder.trustservercertificate?view=dotnet-plat-ext-6.0) setting (optional defaults to true)
- **DEBUG** comma delimited list of enabled logs (optional currently supports app and metrics)

It is **_required_** that the specified user has the following permissions

- GRANT VIEW ANY DEFINITION TO <user>
- GRANT VIEW SERVER STATE TO <user>

## Frequently Asked Questions (FAQ)

### Unable to connect to database

Raised in [issue #19](https://github.com/awaragi/prometheus-mssql-exporter/issues/19)

Probably your SQL Server is working as named instance. For named instances the TCP port is dynamically configured by default, so you may need do explicitly specify port in MSSQL settings as described [here](https://docs.microsoft.com/en-US/sql/database-engine/configure-windows/configure-a-server-to-listen-on-a-specific-tcp-port?view=sql-server-ver15).

### Running multiple instances of exporter

Raised in [issue #20](https://github.com/awaragi/prometheus-mssql-exporter/issues/20)

Each container should use its own docker port forward (e.g. -p 4001:4000 and -p 4002:4000)

### What Grafana dashboard can I use

Here are some suggestions on available Grafana dashboards. If you are an author or such dashboard and want to have it referenced here, simply create a Pull Request.

- https://grafana.com/grafana/dashboards/13919

### Running in the background

Use `docker run -d ...` to run the container in background

## Development

## Launching a test mssql server

To launch a local mssql instance to test against

```shell
npm run test:mssql:2019
# or
npm run test:mssql:2017
```

To use a persistent storage add `-v /<mypath>:/var/opt/mssql/data` to the command line.

## List all available metrics

To list all available metrics and the used queries to generate these metrics - say for for DBA validation, use the following command

```shell
npm run metrics
```

## Environment variables

- SERVER: sqlserver
- PORT: sql server port (optional defaults to 1433)
- USERNAME: sql server user (should have admin or user with required permissions)
- PASSWORD: sql user password
- ENCRYPT: force [encrypt](https://docs.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnectionstringbuilder.encrypt?view=dotnet-plat-ext-6.0) setting (optional defaults to true)
- TRUST_SERVER_CERTIFICATE: sets [trustServerCertificate](https://docs.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnectionstringbuilder.trustservercertificate?view=dotnet-plat-ext-6.0) setting (optional defaults to true)
- EXPOSE: webserver port (defaults to 4000)
- DEBUG: verbose logging
  - app for application logging
  - metrics for metrics executions logging
  - db for database connection logging
  - queries for database queries and results logging

## Launch via command line

### Using NodeJS

To execute and the application using locally running mssql (see above for how to launch a docker instance of mssql),
use the following command which will generate all a detailed logs

```shell
npm start
```

A more verbose execution with all queries and their results printed out

```shell
npm run start:verbose
```

### Using Docker

To build and launch your docker image use the following command

```shell
npm run docker:run
```

## Testing

### Curl or Browser

Use curl or wget to fetch the metrics from launched web application.

```shell
curl http://localhost:4000/metrics
```

### E2E Test with Expectations

E2E test is available to execute against MSSQL 2017 or 2019 docker instances.

The test does not care about the values of the metrics but checks the presence of all expected keys.

To add new metrics, the E2E must get updated with their keys to pass.

```shell
npm test
```

## building and pushing image to dockerhub

Use `docker build` and `docker push` or the bundled Github Workflows/Actions (see .github/workflows)
