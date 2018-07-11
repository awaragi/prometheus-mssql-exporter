Prometheus MSSQL Exporter Docker Container
=============

Prometheus exporter for Microsoft SQL Server (MSSQL). Exposes the following metrics

*  mssql_instance_local_time Number of seconds since epoch on local instance
*  mssql_connections{database,state} Number of active connections
*  mssql_deadlocks Number of lock requests per second that resulted in a deadlock since last restart
*  mssql_user_errors Number of user errors/sec since last restart
*  mssql_sql_compilations Number of SQL compilations per second. Indicates the number of times the compile code path is entered. Includes compiles caused by statement-level recompilations in SQL Server. After SQL Server user activity is stable, this value reaches a steady state
*  mssql_sql_recompilations Number of statement recompiles per second. Counts the number of times statement recompiles are triggered. Generally, you want the recompiles to be low
*  mssql_buffer_cache_hit_ratio Indicates the percentage of pages found in the buffer cache without having to read from disk. The ratio is the total number of cache hits divided by the total number of cache lookups over the last few thousand page accesses. After a long period of time, the ratio moves very little
*  mssql_checkpoint_pages Indicates the number of pages flushed to disk per second by a checkpoint or other operation that require all dirty pages to be flushed
*  mssql_lock_waits Number of lock requests per second that required the caller to wait
*  mssql_page_splits Number of page splits per second that occur as the result of overflowing index pages
*  mssql_kill_connection_errors Number of kill connection errors/sec since last restart
*  mssql_log_growths{database} Total number of times the transaction log for the database has been expanded last restart
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

Usage
-----

`docker run -e SERVER=192.168.56.101 -e USERNAME=SA -e PASSWORD=qkD4x3yy -e DEBUG=app -p 4000:4000 --name prometheus-mssql-exporter awaragi/prometheus-mssql-exporter`

The image supports the following environments and exposes port 4000

* **SERVER** server ip or dns name (required)
* **PORT** server port (optional defaults to 1443)
* **USERNAME** access user (required)
* **PASSWORD** access password (required)
* **DEBUG** comma delimited list of enabled logs (optional currently supports app and metrics)

It is **_required_** that the specified user has the following permissions

* GRANT VIEW ANY DEFINITION TO <user>
* GRANT VIEW SERVER STATE TO <user>

Development
-----------

### Launch via command line

`
SERVER=sqlserver
PORT=sqlport<1443>
USERNAME=sqluser
PASSWORD=sqluserpassword
EXPOSE=webport<4000>
node ./index.js
`

To enable debugging set the environment variable DEBUG to app and/or metrics (DEBUG=app) 

for example:
`DEBUG=app,metrics SERVER=192.168.56.101 USERNAME=SA PASSWORD=qkD4x3yy node ./index.js`

### building and pushing image to dockerhub

`npm run push`

### Launch a mock mssql server

`docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=qkD4x3yy -p 1433:1433 --name mssql -d microsoft/mssql-server-linux`

To use a persistent storage include `-v /mypath:/var/opt/mssql/data`
