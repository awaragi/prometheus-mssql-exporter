Prometheus MSSQL Exporter Docker Container
=============

Prometheus exporter for Microsoft SQL Server. Exposes the following metrics
* UP (gauge)
* mssql_connections (gauge)
* TBD.

Usage
-----

`docker run -e SERVER=192.168.56.102 -e USERNAME=SA -e PASSWORD=qkD4x3yy -e DEBUG=app -p 4000:4000 --name prometheus-mssql-exporter awaragi/prometheus-mssql-exporter`

The image supports the following environments and exposes port 4000

* SERVER=sqlserver
* PORT=sqlport<1443>
* USERNAME=sqluser
* PASSWORD=sqluserpassword
* RECONNECT=ms<1000>
* INTERVAL=ms<1000>

Testing
-------

To start a local test mssql server 

`docker-compose -f docker-compose-test.yml up -d`

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

To enable debugging set the environment variable DEBUG to app (DEBUG=app) 

for example:
`DEBUG=app SERVER=192.168.56.102 USERNAME=SA PASSWORD=qkD4x3yy node ./index.js`

### building and pushing image to dockerhub

`npm run push`

### Launch a mock mssql server

`docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=qkD4x3yy -p 1433:1433 --name mssql -d microsoft/mssql-server-linux`
