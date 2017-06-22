Prometheus MSSQL Exporter Docker Container
=============

Prometheus exporter for Microsoft SQL Server. Exposes the following metrics
* UP gauge
* mssql_instance_local_time gauge
* mssql_connections{database="", state="current"} gauge
* mssql_deadlocks gauge
* mssql_io_stall{database="XXX", type="read"}
* mssql_io_stall_total{database="XXX"}
* mssql_page_fault_count gauge
* mssql_memory_utilization_percentage gauge
* mssql_total_physical_memory_kb gauge
* mssql_available_physical_memory_kb gauge
* mssql_total_page_file_kb gauge
* mssql_available_page_file_kb gauge
* TBD.

Usage
-----

`docker run -e SERVER=192.168.56.102 -e USERNAME=SA -e PASSWORD=qkD4x3yy -e DEBUG=app -p 4000:4000 --name prometheus-mssql-exporter awaragi/prometheus-mssql-exporter`

The image supports the following environments and exposes port 4000

* **SERVER** server ip or dns name (required)
* **PORT** server port (optional defaults to 1443)
* **USERNAME** access user (required)
* **PASSWORD** access password (required)
* **RECONNECT** time in ms between retries to reconnect to a unavailable server (optional defaults to 5000ms)
* **INTERVAL** time in ms between metrics collections (optional defaults to 1000ms)
* **DEBUG** comma delimited list of enabled logs (optional currently supports app and metrics)

Development
-----------

### Launch via command line

`
SERVER=sqlserver
PORT=sqlport<1443>
USERNAME=sqluser
PASSWORD=sqluserpassword
RECONNECT=ms<1000>
INTERVAL=ms<1000>
EXPOSE=webport<4000>
node ./index.js
`

To enable debugging set the environment variable DEBUG to app and/or metrics (DEBUG=app) 

for example:
`DEBUG=app,metrics SERVER=192.168.56.102 USERNAME=SA PASSWORD=qkD4x3yy node ./index.js`

### building and pushing image to dockerhub

`npm run push`

### Launch a mock mssql server

`docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=qkD4x3yy -p 1433:1433 --name mssql -d microsoft/mssql-server-linux`
