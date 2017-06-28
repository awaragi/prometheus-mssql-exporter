/**
 * Created by pierre on 22/06/17.
 */
const debug = require("debug")("metrics");
const client = require('prom-client');

// UP metric
const up = new client.Gauge({name: 'UP', help: "UP Status"});

// Query based metrics
// -------------------
const time = {
    metrics: {
        mssql_instance_local_time: new client.Gauge({name: 'mssql_instance_local_time', help: 'Number of seconds since epoch on local instance'})
    },
    query: `SELECT DATEDIFF(second, '19700101', GETUTCDATE())`,
    collect: function (rows, metrics) {
        const time = rows[0][0].value;
        debug("Fetch current time", time);
        metrics.mssql_instance_local_time.set(time);
    }
};
const connections = {
    metrics: {
        mssql_connections: new client.Gauge({name: 'mssql_connections', help: 'Number of active connections', labelNames: ['database', 'state',]})
    },
    query: `SELECT DB_NAME(sP.dbid)
        , COUNT(sP.spid)
FROM sys.sysprocesses sP
GROUP BY DB_NAME(sP.dbid)
ORDER BY 1`,
    collect: function (rows, metrics) {
        for (var i = 0; i < rows.length; i++) {
            const row = rows[i]
            const database = row[0].value;
            const connections = row[1].value;
            debug("Fetch number of connections for database", database, connections);
            metrics.mssql_connections.set({database: database, state: 'current'}, connections);
        }
    }
};
const deadlocks = {
    metrics: {
        mssql_deadlocks: new client.Gauge({name: 'mssql_deadlocks', help: 'Number of deadlocks/sec since last restart'})
    },
    query: `SELECT cntr_value FROM sys.dm_os_performance_counters with (nolock) WHERE object_name = 'SQLServer:Locks' AND counter_name = 'Number of Deadlocks/sec' AND instance_name = '_Total'`,
    collect: function (rows, metrics) {
        const deadlocks = rows[0][0].value;
        debug("Fetch number of deadlocks/sec", deadlocks);
        metrics.mssql_deadlocks.set(deadlocks)
    }
};
const ioStall = {
    metrics: {
        mssql_io_stall: new client.Gauge({name: 'mssql_io_stall', help: 'Wait time (ms) of stall since last restart', labelNames: ['database', 'type']}),
        mssql_io_stall_total: new client.Gauge({name: 'mssql_io_stall_total', help: 'Wait time (ms) of stall since last restart', labelNames: ['database']}),
    },
    query: `SELECT
cast(DB_Name(a.database_id) as varchar) as name,
    max(io_stall_read_ms),
    max(io_stall_write_ms),
    max(io_stall),
    max(io_stall_queued_read_ms),
    max(io_stall_queued_write_ms)
FROM
sys.dm_io_virtual_file_stats(null, null) a
INNER JOIN sys.master_files b ON a.database_id = b.database_id and a.file_id = b.file_id
group by a.database_id
ORDER BY name
`,
    collect: function (rows, metrics) {
        for (var i = 0; i < rows.length; i++) {
            const row = rows[i];
            const database = row[0].value;
            const read = row[1].value;
            const write = row[2].value;
            const stall = row[3].value;
            const queued_read = row[4].value;
            const queued_write = row[5].value;
            debug("Fetch number of stalls for database", database);
            metrics.mssql_io_stall_total.set({database: database}, stall);
            metrics.mssql_io_stall.set({database: database, type: "read"}, read);
            metrics.mssql_io_stall.set({database: database, type: "write"}, write);
            metrics.mssql_io_stall.set({database: database, type: "queued_read"}, queued_read);
            metrics.mssql_io_stall.set({database: database, type: "queued_write"}, queued_write);
        }
    }
};
const memory = {
    metrics: {
        pageFaultCount: new client.Gauge({name: 'mssql_page_fault_count', help: 'Number of page faults since last restart'}),
        memoryUtilizationPercentage: new client.Gauge({name: 'mssql_memory_utilization_percentage', help: 'Percentage of memory utilization'}),
    },
    query: `select page_fault_count, memory_utilization_percentage from sys.dm_os_process_memory`,
    collect: function (rows, metrics) {
        const page_fault_count = rows[0][0].value;
        const memory_utilization_percentage = rows[0][1].value;
        debug("Fetch page fault count", page_fault_count);
        metrics.pageFaultCount.set(page_fault_count);
        metrics.memoryUtilizationPercentage.set(memory_utilization_percentage);
    }
};
const sysMemory = {
    metrics: {
        total_physical_memory_kb: new client.Gauge({name: 'mssql_total_physical_memory_kb', help: 'Total physical memory in KB'}),
        available_physical_memory_kb: new client.Gauge({name: 'mssql_available_physical_memory_kb', help: 'Available physical memory in KB'}),
        total_page_file_kb: new client.Gauge({name: 'mssql_total_page_file_kb', help: 'Total page file in KB'}),
        available_page_file_kb: new client.Gauge({name: 'mssql_available_page_file_kb', help: 'Available page file in KB'}),
    },
    query: `select total_physical_memory_kb, available_physical_memory_kb, total_page_file_kb, available_page_file_kb from sys.dm_os_sys_memory`,
    collect: function (rows, metrics) {
        debug("Fetch system memory information");
        metrics.total_physical_memory_kb.set(rows[0][0].value);
        metrics.available_physical_memory_kb.set(rows[0][1].value);
        metrics.total_page_file_kb.set(rows[0][2].value);
        metrics.available_page_file_kb.set(rows[0][3].value);
    }
};

const metrics = [time, connections, deadlocks, ioStall, memory, sysMemory];

module.exports = {
    client: client,
    up: up,
    metrics: metrics,
};

// DOCUMENTATION of queries and their associated metrics (targeted to DBAs)
if (require.main === module) {
    metrics.forEach(function (m) {
        for(var key in m.metrics) {
            console.log("--", m.metrics[key].name, m.metrics[key].help);
        }
        console.log(m.query + ";");
        console.log("");
    });
}
