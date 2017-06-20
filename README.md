Prometheus MSSQL Exporter Docker Container
=============

Prometheus exporter for Microsoft SQL Server. Exposes the following metrics
* UP (gauge)
* mssql_connections (gauge)
* TBD.

Usage
-----

### command line

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

for example:
`SERVER=192.168.56.102 USERNAME=SA PASSWORD=qkD4x3yy node ./index.js`

### docker container

`docker build . -t prometheus-mssql-exporter`

`docker run awaragi/prometheus-mssql-exporter 
-e SERVER=192.168.56.102 
-e USERNAME=SA 
-e PASSWORD=qkD4x3yy
`