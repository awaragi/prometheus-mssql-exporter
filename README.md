Prometheus MSSQL Exporter Docker Container
=============

Prometheus exporter for Microsoft SQL Server (MSSQL). Exposes the following metrics

*  mssql_instance_local_time Number of seconds since epoch on local instance
*  mssql_connections{database,state} Number of active connections
*  mssql_deadlocks Number of lock requests per second that resulted in a deadlock since last restart
*  mssql_user_errors Number of user errors/sec since last restart
*  mssql_kill_connection_errors Number of kill connection errors/sec since last restart
*  mssql_database_state{database} State of each database (0=online 1=restoring 2=recovering 3=recovery pending 4=suspect 5=emergency 6=offline 7=copying 10=offline secondary)
*  mssql_log_growths{database} Total number of times the transaction log for the database has been expanded last restart
*  mssql_database_filesize{database,logicalname,type,filename} Physical sizes of files used by database in KB, their names and types (0=rows, 1=log, 2=filestream,3=n/a 4=fulltext(prior to version 2008 of MS SQL Server))
*  mssql_page_life_expectancy Indicates the minimum number of seconds a page will stay in the buffer pool on this node without references. The traditional advice from Microsoft used to be that the PLE should remain above 300 seconds
*  mssql_io_stall{database,type} Wait time (ms) of stall since last restart
*  mssql_io_stall_total{database} Wait time (ms) of stall since last restart
*  mssql_batch_requests Number of Transact-SQL command batches received per second. This statistic is affected by all constraints (such as I/O, number of users, cachesize, complexity of requests, and so on). High batch requests mean good throughput
*  mssql_page_fault_count Number of page faults since last restart
*  mssql_memory_utilization_percentage Percentage of memory utilization
*  mssql_total_physical_memory_kb Total physical memory in KB
*  mssql_available_physical_memory_kb Available physical memory in KB
*  mssql_total_page_file_kb Total page file in KB
*  mssql_available_page_file_kb Available page file in KB

Please feel free to submit other interesting metrics to include.

> This exporter has been tested against MSSQL 2017 and 2019 docker images (only ones offered by Microsoft). Other versions might be work but have not been tested. 

Usage
-----

`docker run -e SERVER=192.168.56.101 -e USERNAME=SA -e PASSWORD=qkD4x3yy -e DEBUG=app -p 4000:4000 --name prometheus-mssql-exporter awaragi/prometheus-mssql-exporter`

The image supports the following environments and exposes port 4000

* **SERVER** server ip or dns name (required)
* **PORT** server port (optional defaults to 1433)
* **USERNAME** access user (required)
* **PASSWORD** access password (required)
* **DEBUG** comma delimited list of enabled logs (optional currently supports app and metrics)

It is **_required_** that the specified user has the following permissions

* GRANT VIEW ANY DEFINITION TO <user>
* GRANT VIEW SERVER STATE TO <user>

Development
-----------

## Launch a test mssql server

To launch a local mssql instance to test against

```shell
npm run test:mssql:2019
# or
npm run test:mssql:2017
```

To use a persistent storage add `-v /mypath:/var/opt/mssql/data` to your version of package.json

## List all available metrics
```shell
node metrics.js
```

## Environment variables

- SERVER: sqlserver
- PORT: sql server port (defaults to 1433)
- USERNAME: sql server user (should have admin or user with required permissions)
- PASSWORD: sql user password
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

Use curl or wget to fetch the metrics from launched web application.

```shell
curl http://localhost:4000/metrics
```

E2E test is available to execute against MSSQL 2017 or 2019 docker instances. 
Any added metrics must get added to the e2e tests.

## Metric listing

Call metrics.js file directly to generate documentation of available metrics and to update this README file.

```shell
node metrics.js
```

## building and pushing image to dockerhub

Use docker push or the bundled Github Workflows/Actions (see .github/workflows)